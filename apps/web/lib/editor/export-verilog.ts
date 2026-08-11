import {
  GateType,
  SignalState,
  SrLatchKind,
  EdgeType,
  NOT_PIN_INPUT,
  NOT_PIN_OUTPUT,
  BUFFER_PIN_INPUT,
  BUFFER_PIN_OUTPUT,
  TRISTATE_PIN_DATA,
  TRISTATE_PIN_ENABLE,
  TRISTATE_PIN_OUTPUT,
  DLATCH_PIN_DATA,
  DLATCH_PIN_ENABLE,
  DLATCH_PIN_Q,
  DLATCH_PIN_QN,
  DFF_PIN_DATA,
  DFF_PIN_CLOCK,
  DFF_PIN_RESET,
  DFF_PIN_SET,
  DFF_PIN_Q,
  DFF_PIN_QN,
  SRLATCH_PIN_S,
  SRLATCH_PIN_R,
  SRLATCH_PIN_Q,
  SRLATCH_PIN_QN,
  JK_PIN_J,
  JK_PIN_K,
  JK_PIN_CLOCK,
  JK_PIN_RESET,
  JK_PIN_SET,
  JK_PIN_Q,
  JK_PIN_QN,
  T_PIN_T,
  T_PIN_CLOCK,
  T_PIN_RESET,
  T_PIN_SET,
  T_PIN_Q,
  T_PIN_QN,
  COUNTER_PIN_CLOCK,
  COUNTER_PIN_RESET,
  COUNTER_PIN_Q0,
  SOURCE_PIN_OUTPUT,
  SINK_PIN_INPUT,
  type GateId,
  type NetId,
} from "@nandscape/engine";
import type { CompiledCircuit } from "./compile-circuit";
import type { EditorNode, IoNodeData, BusInputNodeData, BusOutputNodeData, SevenSegmentNodeData } from "@/types/editor";

export interface VerilogExportResult {
  verilog: string;
  /** Best-effort translation notes,  not blocking errors, but the user
   *  should see them (e.g. non-synthesizable clock generator, latch timing
   *  approximations). Empty when the circuit has none of the affected
   *  constructs. */
  warnings: string[];
}

/** Turns an arbitrary label into a legal, unique Verilog identifier.
 *  Verilog identifiers must start with a letter or underscore and contain
 *  only [A-Za-z0-9_$]; anything else gets replaced, and collisions
 *  (two Input nodes both named "A", a name that collides with a reserved
 *  word, etc) get a numeric suffix so nothing silently overwrites something
 *  else in the emitted module. */
function makeIdentifierAllocator() {
  const used = new Set<string>();
  return (raw: string): string => {
    let base = raw.replace(/[^A-Za-z0-9_$]/g, "_");
    if (!/^[A-Za-z_]/.test(base)) base = `_${base}`;
    if (VERILOG_RESERVED.has(base)) base = `${base}_`;
    let candidate = base;
    let i = 2;
    while (used.has(candidate)) candidate = `${base}_${i++}`;
    used.add(candidate);
    return candidate;
  };
}

const VERILOG_RESERVED = new Set([
  "module", "endmodule", "input", "output", "inout", "wire", "reg", "assign",
  "always", "posedge", "negedge", "if", "else", "case", "endcase", "begin",
  "end", "initial", "parameter", "function", "task", "default", "and", "or",
  "not", "nand", "nor", "xor", "xnor", "buf",
]);

function ioNodeLabel(node: EditorNode): string {
  const data = node.data as IoNodeData;
  return data.name || data.label || node.id;
}

/**
 * Translates an already-flattened, already-compiled circuit (see
 * flattenSubcircuits + compileEditorGraph - subcircuit instances must be
 * resolved before this runs, since this module only understands primitive
 * gates) into a single Verilog module. Every Input/Output/LED/Bus-Input/
 * Bus-Output/Seven-Segment lane becomes a module port; every other node
 * becomes a `wire`/`reg` plus an `assign`/`always` block.
 *
 * This is a structural translation, not a guarantee of cycle-exact
 * simulation parity with this engine's event-driven simulator - see the
 * returned `warnings` for the specific constructs (CLOCK, latches, counter
 * reset) where Verilog's semantics and this engine's differ in edge cases.
 */
export function generateVerilog(nodes: EditorNode[], compiled: CompiledCircuit, moduleName: string): VerilogExportResult {
  const { circuit } = compiled;
  const warnings: string[] = [];
  const allocId = makeIdentifierAllocator();

  const nodeById = new Map(nodes.map((n) => [n.id, n]));

  // gate -> owning node (+ lane index for multi-lane nodes), the reverse of
  // compiled.gateByNodeId / compiled.laneGatesByNodeId.
  const gateOwner = new Map<GateId, { nodeId: string; lane?: number }>();
  for (const [nodeId, gateId] of compiled.gateByNodeId) gateOwner.set(gateId, { nodeId });
  for (const [nodeId, gateIds] of compiled.laneGatesByNodeId) {
    gateIds.forEach((gateId, lane) => gateOwner.set(gateId, { nodeId, lane }));
  }

  const gateCount = circuit.gateCount;

  // ---- Pass 1: name every port (INPUT_PIN/OUTPUT_PIN gates whose owning
  // node is a real IO node, not an internal pass-through) --------------------
  const inputPorts: { name: string; net: NetId }[] = [];
  const outputPorts: { name: string; drivingNet: () => NetId }[] = [];
  const netIdentifier = new Map<NetId, string>();

  for (let g = 0; g < gateCount; g++) {
    const type = circuit.gateType.get(g) as GateType;
    if (type !== GateType.INPUT_PIN && type !== GateType.OUTPUT_PIN) continue;
    const owner = gateOwner.get(g as GateId);
    if (!owner) continue;
    const node = nodeById.get(owner.nodeId);
    if (!node) continue;

    let label: string;
    if (owner.lane !== undefined) {
      const names = (node.data as BusInputNodeData | BusOutputNodeData | SevenSegmentNodeData).names;
      label = names[owner.lane] ?? `${node.id}_${owner.lane}`;
    } else {
      label = ioNodeLabel(node);
    }
    const portName = allocId(label);

    if (type === GateType.INPUT_PIN) {
      const pin = circuit.pinOf(g as GateId, SOURCE_PIN_OUTPUT);
      const net = circuit.pinNet.get(pin) as NetId;
      inputPorts.push({ name: portName, net });
      // The net driven by an input port IS that port - no separate wire.
      netIdentifier.set(net, portName);
    } else {
      const pin = circuit.pinOf(g as GateId, SINK_PIN_INPUT);
      const net = circuit.pinNet.get(pin) as NetId;
      outputPorts.push({ name: portName, drivingNet: () => net });
    }
  }

  // ---- Pass 2: give every remaining net a wire identifier -------------------
  function netRef(net: NetId): string {
    const existing = netIdentifier.get(net);
    if (existing) return existing;
    const id = allocId(`w${net}`);
    netIdentifier.set(net, id);
    return id;
  }

  const wireDecls: string[] = [];
  const regDecls: string[] = [];
  // Vector regs (currently just COUNTER's internal count register) need
  // their own standalone `reg [n-1:0] name;` statement - Verilog doesn't
  // allow mixing a width-prefixed declaration into a comma-joined list of
  // plain 1-bit reg names the way regDecls above gets emitted.
  const vectorRegDecls: string[] = [];
  const combinational: string[] = [];
  const sequential: string[] = [];

  function edgeKeyword(edge: EdgeType): "posedge" | "negedge" {
    if (edge === EdgeType.FALLING) return "negedge";
    return "posedge"; // RISING, and a best-effort default for ANY/NONE - see warning below
  }

  // ---- Pass 3: emit logic for every non-port gate ---------------------------
  for (let g = 0; g < gateCount; g++) {
    const type = circuit.gateType.get(g) as GateType;
    const gid = g as GateId;
    const pinCount = circuit.gatePinCount.get(g);
    const paramA = circuit.gateParamA.get(g);
    const paramB = circuit.gateParamB.get(g);

    const netAt = (role: number): NetId => circuit.pinNet.get(circuit.pinOf(gid, role)) as NetId;
    const refAt = (role: number): string => netRef(netAt(role));

    switch (type) {
      case GateType.INPUT_PIN:
        break; // handled as a port above, no body

      case GateType.OUTPUT_PIN:
        break; // handled via outputPorts below

      case GateType.CONSTANT: {
        const out = refAt(SOURCE_PIN_OUTPUT);
        wireDecls.push(out);
        const lit =
          paramA === SignalState.HIGH ? "1'b1" : paramA === SignalState.LOW ? "1'b0" : paramA === SignalState.FLOAT ? "1'bz" : "1'bx";
        combinational.push(`  assign ${out} = ${lit};`);
        break;
      }

      case GateType.CLOCK: {
        const out = refAt(SOURCE_PIN_OUTPUT);
        regDecls.push(out);
        const initial = paramB === SignalState.HIGH ? "1'b1" : "1'b0";
        sequential.push(`  initial ${out} = ${initial};`);
        sequential.push(`  always #${Math.max(1, paramA)} ${out} = ~${out};`);
        warnings.push(
          `"${out}" is a free-running clock (matching this circuit's simulated clock) - it's not synthesizable and only makes sense for simulating this module in a testbench, not for real hardware.`,
        );
        break;
      }

      case GateType.NOT: {
        const out = refAt(NOT_PIN_OUTPUT);
        wireDecls.push(out);
        combinational.push(`  assign ${out} = ~${refAt(NOT_PIN_INPUT)};`);
        break;
      }

      case GateType.BUFFER: {
        const out = refAt(BUFFER_PIN_OUTPUT);
        wireDecls.push(out);
        combinational.push(`  assign ${out} = ${refAt(BUFFER_PIN_INPUT)};`);
        break;
      }

      case GateType.TRISTATE_BUFFER: {
        const out = refAt(TRISTATE_PIN_OUTPUT);
        wireDecls.push(out);
        combinational.push(`  assign ${out} = ${refAt(TRISTATE_PIN_ENABLE)} ? ${refAt(TRISTATE_PIN_DATA)} : 1'bz;`);
        break;
      }

      case GateType.AND:
      case GateType.OR:
      case GateType.NOR:
      case GateType.NAND:
      case GateType.XOR:
      case GateType.XNOR: {
        const inputCount = pinCount - 1;
        const out = refAt(inputCount);
        wireDecls.push(out);
        const ins = Array.from({ length: inputCount }, (_, i) => refAt(i));
        const op = { [GateType.AND]: "&", [GateType.OR]: "|", [GateType.NAND]: "&", [GateType.NOR]: "|", [GateType.XOR]: "^", [GateType.XNOR]: "^" }[type as number]!;
        const inverted = type === GateType.NAND || type === GateType.NOR || type === GateType.XNOR;
        const expr = ins.join(` ${op} `);
        combinational.push(`  assign ${out} = ${inverted ? `~(${expr})` : expr};`);
        break;
      }

      case GateType.MULTIPLEXER: {
        const n = paramA;
        const dataCount = 1 << n;
        const outRole = n + dataCount;
        const out = refAt(outRole);
        regDecls.push(out);
        const selectExpr = Array.from({ length: n }, (_, i) => refAt(n - 1 - i)).join(", "); // MSB..LSB for {S(n-1),...,S0}
        const lines = [`  always @(*) begin`, `    case ({${selectExpr}})`];
        for (let idx = 0; idx < dataCount; idx++) {
          lines.push(`      ${n}'d${idx}: ${out} = ${refAt(n + idx)};`);
        }
        lines.push(`      default: ${out} = 1'bx;`, `    endcase`, `  end`);
        sequential.push(lines.join("\n"));
        break;
      }

      case GateType.DEMULTIPLEXER: {
        const n = paramA;
        const outCount = 1 << n;
        const dataRef = refAt(0);
        const selectExpr = Array.from({ length: n }, (_, i) => refAt(n - i)).join(", "); // roles 1..n
        const outRefs = Array.from({ length: outCount }, (_, i) => refAt(n + 1 + i));
        outRefs.forEach((r) => regDecls.push(r));
        const lines = [`  always @(*) begin`];
        outRefs.forEach((r) => lines.push(`    ${r} = 1'b0;`));
        lines.push(`    case ({${selectExpr}})`);
        for (let idx = 0; idx < outCount; idx++) {
          lines.push(`      ${n}'d${idx}: ${outRefs[idx]} = ${dataRef};`);
        }
        lines.push(`    endcase`, `  end`);
        sequential.push(lines.join("\n"));
        break;
      }

      case GateType.DECODER: {
        const n = paramA;
        const outCount = 1 << n;
        const addrExpr = Array.from({ length: n }, (_, i) => refAt(n - 1 - i)).join(", "); // roles 0..n-1, MSB..LSB
        const outRefs = Array.from({ length: outCount }, (_, i) => refAt(n + i));
        outRefs.forEach((r) => regDecls.push(r));
        const lines = [`  always @(*) begin`];
        outRefs.forEach((r) => lines.push(`    ${r} = 1'b0;`));
        lines.push(`    case ({${addrExpr}})`);
        for (let idx = 0; idx < outCount; idx++) {
          lines.push(`      ${n}'d${idx}: ${outRefs[idx]} = 1'b1;`);
        }
        lines.push(`    endcase`, `  end`);
        sequential.push(lines.join("\n"));
        break;
      }

      case GateType.PRIORITY_ENCODER: {
        const n = paramA;
        const dataCount = 1 << n;
        const dataRefs = Array.from({ length: dataCount }, (_, i) => refAt(i));
        const addrRefs = Array.from({ length: n }, (_, i) => refAt(dataCount + i));
        const validRef = refAt(dataCount + n);
        addrRefs.forEach((r) => regDecls.push(r));
        regDecls.push(validRef);
        const lines = [`  always @(*) begin`];
        addrRefs.forEach((r) => lines.push(`    ${r} = 1'b0;`));
        lines.push(`    ${validRef} = 1'b0;`);
        // Ascending order so a later (higher-index) assignment overwrites an
        // earlier one - matches "highest active index wins".
        for (let idx = 0; idx < dataCount; idx++) {
          lines.push(`    if (${dataRefs[idx]}) begin`);
          for (let bit = 0; bit < n; bit++) {
            lines.push(`      ${addrRefs[bit]} = ${(idx >> bit) & 1 ? "1'b1" : "1'b0"};`);
          }
          lines.push(`      ${validRef} = 1'b1;`, `    end`);
        }
        lines.push(`  end`);
        sequential.push(lines.join("\n"));
        break;
      }

      case GateType.D_LATCH: {
        const q = refAt(DLATCH_PIN_Q);
        const qn = refAt(DLATCH_PIN_QN);
        regDecls.push(q);
        wireDecls.push(qn);
        sequential.push(`  always @(*) if (${refAt(DLATCH_PIN_ENABLE)}) ${q} <= ${refAt(DLATCH_PIN_DATA)};`);
        combinational.push(`  assign ${qn} = ~${q};`);
        break;
      }

      case GateType.SR_LATCH: {
        const q = refAt(SRLATCH_PIN_Q);
        const qn = refAt(SRLATCH_PIN_QN);
        regDecls.push(q);
        wireDecls.push(qn);
        const nandBased = paramA === SrLatchKind.NAND_BASED;
        const setAsserted = nandBased ? `~${refAt(SRLATCH_PIN_S)}` : refAt(SRLATCH_PIN_S);
        const resetAsserted = nandBased ? `~${refAt(SRLATCH_PIN_R)}` : refAt(SRLATCH_PIN_R);
        sequential.push(
          [
            `  always @(*) begin`,
            `    if ((${setAsserted}) && (${resetAsserted})) ${q} <= 1'bx; // forbidden state`,
            `    else if (${setAsserted}) ${q} <= 1'b1;`,
            `    else if (${resetAsserted}) ${q} <= 1'b0;`,
            `  end`,
          ].join("\n"),
        );
        combinational.push(`  assign ${qn} = ~${q};`);
        break;
      }

      case GateType.FLIP_FLOP: {
        const q = refAt(DFF_PIN_Q);
        const qn = refAt(DFF_PIN_QN);
        regDecls.push(q);
        wireDecls.push(qn);
        const clk = refAt(DFF_PIN_CLOCK);
        const rst = refAt(DFF_PIN_RESET);
        const set = refAt(DFF_PIN_SET);
        const edge = edgeKeyword(paramA as EdgeType);
        if (paramA !== EdgeType.RISING && paramA !== EdgeType.FALLING) {
          warnings.push(`A flip-flop's clock edge type isn't a simple rising/falling edge - approximated as ${edge} in the Verilog output.`);
        }
        sequential.push(
          [
            `  always @(${edge} ${clk} or posedge ${rst} or posedge ${set}) begin`,
            `    if (${rst} && ${set}) ${q} <= 1'bx;`,
            `    else if (${rst}) ${q} <= 1'b0;`,
            `    else if (${set}) ${q} <= 1'b1;`,
            `    else ${q} <= ${refAt(DFF_PIN_DATA)};`,
            `  end`,
          ].join("\n"),
        );
        combinational.push(`  assign ${qn} = ~${q};`);
        break;
      }

      case GateType.JK_FLIP_FLOP: {
        const q = refAt(JK_PIN_Q);
        const qn = refAt(JK_PIN_QN);
        regDecls.push(q);
        wireDecls.push(qn);
        const clk = refAt(JK_PIN_CLOCK);
        const rst = refAt(JK_PIN_RESET);
        const set = refAt(JK_PIN_SET);
        const edge = edgeKeyword(paramA as EdgeType);
        sequential.push(
          [
            `  always @(${edge} ${clk} or posedge ${rst} or posedge ${set}) begin`,
            `    if (${rst} && ${set}) ${q} <= 1'bx;`,
            `    else if (${rst}) ${q} <= 1'b0;`,
            `    else if (${set}) ${q} <= 1'b1;`,
            `    else case ({${refAt(JK_PIN_J)}, ${refAt(JK_PIN_K)}})`,
            `      2'b00: ${q} <= ${q};`,
            `      2'b01: ${q} <= 1'b0;`,
            `      2'b10: ${q} <= 1'b1;`,
            `      2'b11: ${q} <= ~${q};`,
            `    endcase`,
            `  end`,
          ].join("\n"),
        );
        combinational.push(`  assign ${qn} = ~${q};`);
        break;
      }

      case GateType.T_FLIP_FLOP: {
        const q = refAt(T_PIN_Q);
        const qn = refAt(T_PIN_QN);
        regDecls.push(q);
        wireDecls.push(qn);
        const clk = refAt(T_PIN_CLOCK);
        const rst = refAt(T_PIN_RESET);
        const set = refAt(T_PIN_SET);
        const edge = edgeKeyword(paramA as EdgeType);
        sequential.push(
          [
            `  always @(${edge} ${clk} or posedge ${rst} or posedge ${set}) begin`,
            `    if (${rst} && ${set}) ${q} <= 1'bx;`,
            `    else if (${rst}) ${q} <= 1'b0;`,
            `    else if (${set}) ${q} <= 1'b1;`,
            `    else if (${refAt(T_PIN_T)}) ${q} <= ~${q};`,
            `  end`,
          ].join("\n"),
        );
        combinational.push(`  assign ${qn} = ~${q};`);
        break;
      }

      case GateType.COUNTER: {
        const n = paramA;
        const width = allocId(`cnt${g}`);
        vectorRegDecls.push(`  reg [${n - 1}:0] ${width};`);
        const clk = refAt(COUNTER_PIN_CLOCK);
        const rst = refAt(COUNTER_PIN_RESET);
        sequential.push(
          [
            `  always @(posedge ${clk} or posedge ${rst}) begin`,
            `    if (${rst}) ${width} <= 0;`,
            `    else ${width} <= ${width} + 1'b1;`,
            `  end`,
          ].join("\n"),
        );
        warnings.push(
          `A counter's reset is level-sensitive in the simulator (held at 0 for as long as reset stays high) but modeled here with Verilog's usual edge-triggered async-reset idiom - it clears once on reset's rising edge rather than being continuously forced to 0 while reset is held high.`,
        );
        for (let bit = 0; bit < n; bit++) {
          const qBit = refAt(COUNTER_PIN_Q0 + bit);
          wireDecls.push(qBit);
          combinational.push(`  assign ${qBit} = ${width}[${bit}];`);
        }
        break;
      }

      default:
        warnings.push(`Gate type ${GateType[type] ?? type} isn't supported by the Verilog exporter and was skipped.`);
        break;
    }
  }

  // ---- Assemble the module ---------------------------------------------------
  const outputAssigns = outputPorts.map((p) => `  assign ${p.name} = ${netRef(p.drivingNet())};`);

  const portDecls = [
    ...inputPorts.map((p) => `  input ${p.name}`),
    ...outputPorts.map((p) => `  output ${p.name}`),
  ];

  const lines: string[] = [];
  lines.push(`// Generated by nandscape - structural export, see in-file notes for any`);
  lines.push(`// approximations made translating this circuit's simulation semantics to Verilog.`);
  lines.push(`module ${moduleName} (`);
  lines.push(portDecls.join(",\n"));
  lines.push(`);`);
  lines.push("");

  // A net can pick up more than one wireDecls/regDecls push if it has
  // multiple drivers (e.g. two tristate buffers sharing a bus net) - dedupe
  // before emitting, since `wire w5, w5;` is a Verilog redeclaration error.
  const uniqueWireDecls = Array.from(new Set(wireDecls));
  const uniqueRegDecls = Array.from(new Set(regDecls));

  if (uniqueWireDecls.length > 0) {
    lines.push(`  wire ${uniqueWireDecls.join(", ")};`);
  }
  if (uniqueRegDecls.length > 0) {
    lines.push(`  reg ${uniqueRegDecls.join(", ")};`);
  }
  if (vectorRegDecls.length > 0) {
    lines.push(...Array.from(new Set(vectorRegDecls)));
  }
  lines.push("");

  if (combinational.length > 0) lines.push(combinational.join("\n"), "");
  if (sequential.length > 0) lines.push(sequential.join("\n\n"), "");
  if (outputAssigns.length > 0) lines.push(outputAssigns.join("\n"), "");

  lines.push(`endmodule`);
  lines.push("");

  return { verilog: lines.join("\n"), warnings: Array.from(new Set(warnings)) };
}
