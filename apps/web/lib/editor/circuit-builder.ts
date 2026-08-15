import { GateType, SignalState } from "@nandscape/engine";
import {
  createGateNode,
  createIoNode,
  createBusInputNode,
  createBusOutputNode,
  createSevenSegmentNode,
} from "@/components/editor/nodes/node-registry";
import type { EditorNode, EditorEdge } from "@/types/editor";

export interface Port {
  readonly nodeId: string;
  readonly handle: string;
}

export class NodeHandle {
  public constructor(public readonly id: string) {}

  public out(index: number = 0): Port {
    return { nodeId: this.id, handle: `out-${index}` };
  }

  public in(index: number = 0): Port {
    return { nodeId: this.id, handle: `in-${index}` };
  }
}

export interface NodeOptions {
  id?: string;
  value?: SignalState;
}

export class CircuitBuilder {
  private readonly nodes: EditorNode[] = [];
  private readonly edges: EditorEdge[] = [];
  private edgeCount: number = 0;
  private nodeCount: number = 0;

  private nextEdgeId(): string {
    this.edgeCount += 1;
    return `e${this.edgeCount}`;
  }

  private nextNodeId(prefix: string): string {
    this.nodeCount += 1;
    return `${prefix}_${this.nodeCount}`;
  }

  public input(label: string, x: number, y: number, options?: NodeOptions): NodeHandle {
    const id = options?.id || this.nextNodeId("in");
    const node = createIoNode({ x, y }, "input", label, { id, value: options?.value });
    this.nodes.push(node);
    return new NodeHandle(node.id);
  }

  public output(label: string, x: number, y: number, options?: NodeOptions): NodeHandle {
    const id = options?.id || this.nextNodeId("out");
    const node = createIoNode({ x, y }, "output", label, { id });
    this.nodes.push(node);
    return new NodeHandle(node.id);
  }

  public gate(type: GateType, x: number, y: number, options?: NodeOptions): NodeHandle {
    const id = options?.id || this.nextNodeId("gate");
    const node = createGateNode({ x, y }, type, { id });
    this.nodes.push(node);
    return new NodeHandle(node.id);
  }

  public busInput(
    names: string[],
    x: number,
    y: number,
    options?: NodeOptions & { values?: SignalState[] },
  ): NodeHandle {
    const id = options?.id || this.nextNodeId("bus-input");
    const node = createBusInputNode({ x, y }, { id, names, values: options?.values });
    this.nodes.push(node);
    return new NodeHandle(node.id);
  }

  public busOutput(names: string[], x: number, y: number, options?: NodeOptions): NodeHandle {
    const id = options?.id || this.nextNodeId("bus-output");
    const node = createBusOutputNode({ x, y }, { id, names });
    this.nodes.push(node);
    return new NodeHandle(node.id);
  }

  public sevenSegment(
    names: [string, string, string, string, string, string, string],
    x: number,
    y: number,
    options?: NodeOptions,
  ): NodeHandle {
    const id = options?.id || this.nextNodeId("seven-segment");
    const node = createSevenSegmentNode({ x, y }, { id, names });
    this.nodes.push(node);
    return new NodeHandle(node.id);
  }

  public connect(from: Port, to: Port): void {
    this.edges.push({
      id: this.nextEdgeId(),
      source: from.nodeId,
      sourceHandle: from.handle,
      target: to.nodeId,
      targetHandle: to.handle,
      type: "wire",
      data: {}
    });
  }

  public build(): { nodes: EditorNode[]; edges: EditorEdge[] } {
    return { nodes: this.nodes, edges: this.edges };
  }
}