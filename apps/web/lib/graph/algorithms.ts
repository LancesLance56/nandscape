import { adjacency, edgeKey, formatList, type AlgorithmStep, type GraphSpec } from "./types";

/**
 * Every function here returns the full list of frames up front rather than
 * stepping lazily. Runs are tiny (a dozen nodes at most) and precomputing
 * means the step player can scrub backwards for free, which matters more for
 * teaching than the memory would.
 */

function firstNodeId(graph: GraphSpec, start?: string): string {
  if (start && graph.nodes.some((n) => n.id === start)) return start;
  return graph.nodes[0]?.id ?? "";
}

/** Breadth-first search: a queue, so the frontier expands ring by ring. */
export function bfsSteps(graph: GraphSpec, start?: string): AlgorithmStep[] {
  const source = firstNodeId(graph, start);
  if (!source) return [];

  const adj = adjacency(graph);
  const directed = Boolean(graph.directed);
  const steps: AlgorithmStep[] = [];

  const visited: string[] = [];
  const treeEdges: string[] = [];
  const queue: string[] = [source];
  const seen = new Set<string>([source]);

  steps.push({
    caption: `Start at ${source}. The queue holds the nodes we know about but haven't looked at yet, so ${source} goes in first.`,
    visited: [],
    active: null,
    frontier: [...queue],
    treeEdges: [],
    consideredEdge: null,
    rejectedEdges: [],
  });

  while (queue.length > 0) {
    const current = queue.shift()!;
    visited.push(current);

    const added: string[] = [];
    for (const { to } of adj.get(current) ?? []) {
      if (seen.has(to)) continue;
      seen.add(to);
      queue.push(to);
      added.push(to);
      treeEdges.push(edgeKey(current, to, directed));
    }

    const caption =
      added.length > 0
        ? `Take ${current} off the front of the queue and mark it visited. ${formatList(added)} ${added.length === 1 ? "is" : "are"} new, so ${added.length === 1 ? "it goes" : "they go"} on the back of the queue.`
        : `Take ${current} off the front and mark it visited. Every neighbour is already spoken for, so nothing new joins the queue.`;

    steps.push({
      caption,
      visited: [...visited],
      active: current,
      frontier: [...queue],
      treeEdges: [...treeEdges],
      consideredEdge: null,
      rejectedEdges: [],
    });
  }

  steps.push({
    caption: `Queue is empty, so we're done. BFS reached ${visited.length} node${visited.length === 1 ? "" : "s"} in the order ${visited.join(" → ")}.`,
    visited: [...visited],
    active: null,
    frontier: [],
    treeEdges: [...treeEdges],
    consideredEdge: null,
    rejectedEdges: [],
  });

  return steps;
}

/** Depth-first search: a stack, so it runs to the end of a path before backing up. */
export function dfsSteps(graph: GraphSpec, start?: string): AlgorithmStep[] {
  const source = firstNodeId(graph, start);
  if (!source) return [];

  const adj = adjacency(graph);
  const directed = Boolean(graph.directed);
  const steps: AlgorithmStep[] = [];

  const visited: string[] = [];
  const treeEdges: string[] = [];
  const stack: string[] = [source];
  const parent = new Map<string, string>();

  steps.push({
    caption: `Start at ${source}. Same idea as BFS, but this time the pile is a stack: we always take the node we saw most recently.`,
    visited: [],
    active: null,
    frontier: [...stack],
    treeEdges: [],
    consideredEdge: null,
    rejectedEdges: [],
  });

  const seen = new Set<string>();

  while (stack.length > 0) {
    const current = stack.pop()!;
    if (seen.has(current)) continue;
    seen.add(current);
    visited.push(current);

    const from = parent.get(current);
    if (from) treeEdges.push(edgeKey(from, current, directed));

    const added: string[] = [];
    // Push in reverse so the alphabetically-first neighbour is popped first,
    // which is what a hand-traced DFS on paper would do.
    const neighbours = [...(adj.get(current) ?? [])].reverse();
    for (const { to } of neighbours) {
      if (seen.has(to)) continue;
      stack.push(to);
      parent.set(to, current);
      added.push(to);
    }

    const caption =
      added.length > 0
        ? `Pop ${current} and mark it visited. Push its unvisited neighbours (${formatList([...added].reverse())}) onto the stack. The last one pushed is the next one we'll explore.`
        : `Pop ${current}. It has no unvisited neighbours, so this path is a dead end and we back up to whatever is next on the stack.`;

    steps.push({
      caption,
      visited: [...visited],
      active: current,
      frontier: [...stack],
      treeEdges: [...treeEdges],
      consideredEdge: null,
      rejectedEdges: [],
    });
  }

  steps.push({
    caption: `Stack is empty. DFS visited ${visited.join(" → ")}. Notice it dives deep first instead of spreading out evenly.`,
    visited: [...visited],
    active: null,
    frontier: [],
    treeEdges: [...treeEdges],
    consideredEdge: null,
    rejectedEdges: [],
  });

  return steps;
}

const INF = Number.POSITIVE_INFINITY;

function distTable(dist: Map<string, number>): Record<string, string> {
  const out: Record<string, string> = {};
  for (const [id, d] of dist) out[id] = d === INF ? "∞" : String(d);
  return out;
}

/** Dijkstra: always finalise the closest unfinished node, then relax its edges. */
export function dijkstraSteps(graph: GraphSpec, start?: string): AlgorithmStep[] {
  const source = firstNodeId(graph, start);
  if (!source) return [];

  const adj = adjacency(graph);
  const directed = Boolean(graph.directed);
  const steps: AlgorithmStep[] = [];

  const dist = new Map<string, number>(graph.nodes.map((n) => [n.id, n.id === source ? 0 : INF]));
  const parent = new Map<string, string>();
  const done = new Set<string>();
  const visited: string[] = [];
  const treeEdges: string[] = [];

  steps.push({
    caption: `Every node starts at infinity because we haven't found any route to it yet. ${source} is the exception: it costs nothing to stand where you already are, so it starts at 0.`,
    visited: [],
    active: null,
    frontier: [],
    treeEdges: [],
    consideredEdge: null,
    rejectedEdges: [],
    table: distTable(dist),
  });

  while (done.size < graph.nodes.length) {
    let current: string | null = null;
    let best = INF;
    for (const [id, d] of dist) {
      if (done.has(id)) continue;
      if (d < best) {
        best = d;
        current = id;
      }
    }

    // Everything reachable is finalised; the rest is a disconnected island.
    if (current === null) break;

    done.add(current);
    visited.push(current);
    if (parent.has(current)) treeEdges.push(edgeKey(parent.get(current)!, current, directed));

    const improved: string[] = [];
    for (const { to, weight } of adj.get(current) ?? []) {
      if (done.has(to)) continue;
      const candidate = best + weight;
      if (candidate < (dist.get(to) ?? INF)) {
        const before = dist.get(to) ?? INF;
        dist.set(to, candidate);
        parent.set(to, current);
        improved.push(`${to} ${before === INF ? "∞" : before} → ${candidate}`);
      }
    }

    const caption =
      improved.length > 0
        ? `${current} is the closest node we haven't finalised (cost ${best}), so lock it in. Going through ${current} gives a cheaper route to ${formatList(improved)}.`
        : `${current} is the closest unfinalised node (cost ${best}). Lock it in. Nothing gets cheaper by routing through it, so no numbers change.`;

    steps.push({
      caption,
      visited: [...visited],
      active: current,
      frontier: graph.nodes.filter((n) => !done.has(n.id) && (dist.get(n.id) ?? INF) < INF).map((n) => n.id),
      treeEdges: [...treeEdges],
      consideredEdge: null,
      rejectedEdges: [],
      table: distTable(dist),
    });
  }

  steps.push({
    caption: `Done. Each number is now the cheapest possible cost from ${source} to that node, and the highlighted edges show the route that achieves it.`,
    visited: [...visited],
    active: null,
    frontier: [],
    treeEdges: [...treeEdges],
    consideredEdge: null,
    rejectedEdges: [],
    table: distTable(dist),
  });

  return steps;
}

/** Kruskal: sort every edge by weight, take it unless it closes a cycle. */
export function kruskalSteps(graph: GraphSpec): AlgorithmStep[] {
  const steps: AlgorithmStep[] = [];
  const parent = new Map<string, string>(graph.nodes.map((n) => [n.id, n.id]));

  const find = (x: string): string => {
    let root = x;
    while (parent.get(root) !== root) root = parent.get(root)!;
    return root;
  };
  const union = (a: string, b: string) => parent.set(find(a), find(b));

  const componentGroups = (): string[][] => {
    const byRoot = new Map<string, string[]>();
    for (const n of graph.nodes) {
      const r = find(n.id);
      byRoot.set(r, [...(byRoot.get(r) ?? []), n.id]);
    }
    return [...byRoot.values()].filter((g) => g.length > 1);
  };

  const sorted = [...graph.edges].sort((a, b) => (a.weight ?? 1) - (b.weight ?? 1));
  const treeEdges: string[] = [];
  const rejectedEdges: string[] = [];
  let total = 0;

  steps.push({
    caption: `Kruskal ignores where the edges are on the page and just sorts them cheapest first. Right now every node is its own island.`,
    visited: [],
    active: null,
    frontier: sorted.map((e) => `${e.from}${e.to} (${e.weight ?? 1})`),
    treeEdges: [],
    consideredEdge: null,
    rejectedEdges: [],
    groups: componentGroups(),
  });

  for (const e of sorted) {
    const key = edgeKey(e.from, e.to, false);
    const sameComponent = find(e.from) === find(e.to);

    if (sameComponent) {
      rejectedEdges.push(key);
      steps.push({
        caption: `Edge ${e.from}${e.to} costs ${e.weight ?? 1}, but ${e.from} and ${e.to} are already connected through edges we took. Adding it would close a loop, so skip it.`,
        visited: [],
        active: null,
        frontier: [],
        treeEdges: [...treeEdges],
        consideredEdge: key,
        rejectedEdges: [...rejectedEdges],
        groups: componentGroups(),
      });
      continue;
    }

    union(e.from, e.to);
    treeEdges.push(key);
    total += e.weight ?? 1;

    steps.push({
      caption: `Edge ${e.from}${e.to} costs ${e.weight ?? 1} and joins two separate groups, so take it. Running total: ${total}.`,
      visited: [],
      active: null,
      frontier: [],
      treeEdges: [...treeEdges],
      consideredEdge: key,
      rejectedEdges: [...rejectedEdges],
      groups: componentGroups(),
    });
  }

  steps.push({
    caption: `Every node is now in one group, connected by ${treeEdges.length} edges for a total weight of ${total}. No cheaper set of edges can connect all of them.`,
    visited: graph.nodes.map((n) => n.id),
    active: null,
    frontier: [],
    treeEdges: [...treeEdges],
    consideredEdge: null,
    rejectedEdges: [...rejectedEdges],
    groups: componentGroups(),
  });

  return steps;
}

/** Prim: grow one blob outward, always taking the cheapest edge leaving it. */
export function primSteps(graph: GraphSpec, start?: string): AlgorithmStep[] {
  const source = firstNodeId(graph, start);
  if (!source) return [];

  const adj = adjacency(graph);
  const steps: AlgorithmStep[] = [];
  const inTree = new Set<string>([source]);
  const treeEdges: string[] = [];
  let total = 0;

  steps.push({
    caption: `Prim grows a single connected blob instead of scattered groups. Start it at ${source}.`,
    visited: [source],
    active: source,
    frontier: [],
    treeEdges: [],
    consideredEdge: null,
    rejectedEdges: [],
    groups: [[source]],
  });

  while (inTree.size < graph.nodes.length) {
    let bestFrom: string | null = null;
    let bestTo: string | null = null;
    let bestWeight = INF;

    for (const from of inTree) {
      for (const { to, weight } of adj.get(from) ?? []) {
        if (inTree.has(to)) continue;
        if (weight < bestWeight) {
          bestWeight = weight;
          bestFrom = from;
          bestTo = to;
        }
      }
    }

    if (bestTo === null || bestFrom === null) break;

    inTree.add(bestTo);
    treeEdges.push(edgeKey(bestFrom, bestTo, false));
    total += bestWeight;

    steps.push({
      caption: `The cheapest edge leaving the blob is ${bestFrom}${bestTo} at ${bestWeight}, so swallow ${bestTo}. Running total: ${total}.`,
      visited: [...inTree],
      active: bestTo,
      frontier: [],
      treeEdges: [...treeEdges],
      consideredEdge: edgeKey(bestFrom, bestTo, false),
      rejectedEdges: [],
      groups: [[...inTree]],
    });
  }

  steps.push({
    caption: `The blob covers every node. Total weight ${total}, which is the same number Kruskal lands on. Different route, same answer.`,
    visited: [...inTree],
    active: null,
    frontier: [],
    treeEdges: [...treeEdges],
    consideredEdge: null,
    rejectedEdges: [],
    groups: [[...inTree]],
  });

  return steps;
}

/**
 * Tarjan's strongly connected components. Iterative rather than recursive so
 * a step can be emitted at each decision point instead of only at return.
 */
export function tarjanSteps(graph: GraphSpec): AlgorithmStep[] {
  const adj = adjacency({ ...graph, directed: true });
  const steps: AlgorithmStep[] = [];

  const disc = new Map<string, number>();
  const low = new Map<string, number>();
  const onStack = new Set<string>();
  const stack: string[] = [];
  const components: string[][] = [];
  const treeEdges: string[] = [];
  let counter = 0;

  const table = (): Record<string, string> => {
    const out: Record<string, string> = {};
    for (const n of graph.nodes) {
      out[n.id] = disc.has(n.id) ? `${disc.get(n.id)}/${low.get(n.id)}` : "-";
    }
    return out;
  };

  steps.push({
    caption: `Each node gets two numbers: when we first reached it, and the earliest node it can still loop back to. They start equal and only the second one moves.`,
    visited: [],
    active: null,
    frontier: [],
    treeEdges: [],
    consideredEdge: null,
    rejectedEdges: [],
    table: table(),
    groups: [],
  });

  const strongConnect = (root: string) => {
    // Explicit frame stack: [node, index of next neighbour to examine]
    const frames: { node: string; i: number }[] = [{ node: root, i: 0 }];

    disc.set(root, counter);
    low.set(root, counter);
    counter++;
    stack.push(root);
    onStack.add(root);

    steps.push({
      caption: `Reach ${root} for the first time. Give it number ${disc.get(root)} and push it on the stack.`,
      visited: [...disc.keys()],
      active: root,
      frontier: [...stack],
      treeEdges: [...treeEdges],
      consideredEdge: null,
      rejectedEdges: [],
      table: table(),
      groups: components.map((c) => [...c]),
    });

    while (frames.length > 0) {
      const frame = frames[frames.length - 1];
      const neighbours = adj.get(frame.node) ?? [];

      if (frame.i < neighbours.length) {
        const { to } = neighbours[frame.i];
        frame.i++;

        if (!disc.has(to)) {
          treeEdges.push(edgeKey(frame.node, to, true));
          disc.set(to, counter);
          low.set(to, counter);
          counter++;
          stack.push(to);
          onStack.add(to);
          frames.push({ node: to, i: 0 });

          steps.push({
            caption: `${frame.node} points at ${to}, which is new. Give ${to} number ${disc.get(to)}, push it, and carry on from there.`,
            visited: [...disc.keys()],
            active: to,
            frontier: [...stack],
            treeEdges: [...treeEdges],
            consideredEdge: edgeKey(frame.node, to, true),
            rejectedEdges: [],
            table: table(),
            groups: components.map((c) => [...c]),
          });
        } else if (onStack.has(to)) {
          const before = low.get(frame.node)!;
          const after = Math.min(before, disc.get(to)!);
          low.set(frame.node, after);

          steps.push({
            caption:
              after < before
                ? `${frame.node} points back at ${to}, which is still on the stack. That's a loop, so ${frame.node}'s reach-back number drops to ${after}.`
                : `${frame.node} points at ${to}, already on the stack, but that doesn't reach any further back than we already knew.`,
            visited: [...disc.keys()],
            active: frame.node,
            frontier: [...stack],
            treeEdges: [...treeEdges],
            consideredEdge: edgeKey(frame.node, to, true),
            rejectedEdges: [],
            table: table(),
            groups: components.map((c) => [...c]),
          });
        } else {
          steps.push({
            caption: `${frame.node} points at ${to}, but ${to} already belongs to a finished component. Ignore that edge.`,
            visited: [...disc.keys()],
            active: frame.node,
            frontier: [...stack],
            treeEdges: [...treeEdges],
            consideredEdge: edgeKey(frame.node, to, true),
            rejectedEdges: [edgeKey(frame.node, to, true)],
            table: table(),
            groups: components.map((c) => [...c]),
          });
        }
        continue;
      }

      // Finished every neighbour of this node.
      frames.pop();
      const node = frame.node;

      if (frames.length > 0) {
        const caller = frames[frames.length - 1].node;
        low.set(caller, Math.min(low.get(caller)!, low.get(node)!));
      }

      if (low.get(node) === disc.get(node)) {
        const component: string[] = [];
        for (;;) {
          const popped = stack.pop()!;
          onStack.delete(popped);
          component.push(popped);
          if (popped === node) break;
        }
        components.push(component);

        steps.push({
          caption: `${node} can't reach back past itself, so it's the root of a component. Pop the stack down to ${node}: ${formatList(component)} form one strongly connected component.`,
          visited: [...disc.keys()],
          active: node,
          frontier: [...stack],
          treeEdges: [...treeEdges],
          consideredEdge: null,
          rejectedEdges: [],
          table: table(),
          groups: components.map((c) => [...c]),
        });
      } else {
        steps.push({
          caption: `Done with ${node}'s edges. It can still reach back to ${low.get(node)}, so it belongs to a bigger component that isn't closed yet. Back up.`,
          visited: [...disc.keys()],
          active: frames.length > 0 ? frames[frames.length - 1].node : null,
          frontier: [...stack],
          treeEdges: [...treeEdges],
          consideredEdge: null,
          rejectedEdges: [],
          table: table(),
          groups: components.map((c) => [...c]),
        });
      }
    }
  };

  for (const n of graph.nodes) {
    if (!disc.has(n.id)) strongConnect(n.id);
  }

  steps.push({
    caption: `Every node is assigned. This graph has ${components.length} strongly connected component${components.length === 1 ? "" : "s"}. Inside one, you can get from any node to any other and back again.`,
    visited: graph.nodes.map((n) => n.id),
    active: null,
    frontier: [],
    treeEdges: [...treeEdges],
    consideredEdge: null,
    rejectedEdges: [],
    table: table(),
    groups: components.map((c) => [...c]),
  });

  return steps;
}

/**
 * Kahn's algorithm: repeatedly emit any node with nothing left blocking it.
 *
 * The initial ready queue is built by scanning `graph.nodes` in the order
 * the author listed them, not alphabetically - two nodes both starting at
 * in-degree 0 have no other rule to break the tie, so the order they were
 * written in is as good as any and keeps a run reproducible without
 * pretending there is a deeper reason one goes first.
 */
export function topologicalSortSteps(graph: GraphSpec): AlgorithmStep[] {
  const steps: AlgorithmStep[] = [];
  const adj = adjacency(graph);
  const directed = Boolean(graph.directed);

  const inDegree = new Map<string, number>();
  for (const n of graph.nodes) inDegree.set(n.id, 0);
  for (const e of graph.edges) inDegree.set(e.to, (inDegree.get(e.to) ?? 0) + 1);

  const table = (): Record<string, string> =>
    Object.fromEntries(graph.nodes.map((n) => [n.id, String(inDegree.get(n.id) ?? 0)]));

  const queue: string[] = graph.nodes.filter((n) => inDegree.get(n.id) === 0).map((n) => n.id);
  const output: string[] = [];
  const treeEdges: string[] = [];

  steps.push({
    caption:
      queue.length > 0
        ? `Every node starts tagged with its in-degree: how many arrows point at it. ${formatList(queue)} already ${queue.length === 1 ? "has" : "have"} nothing pointing at ${queue.length === 1 ? "it" : "them"}, so ${queue.length === 1 ? "it goes" : "they go"} straight into the ready queue.`
        : `Every node starts tagged with its in-degree. Nothing starts at 0, so nothing is ready yet - on a graph with edges at all, that alone means a cycle is coming.`,
    visited: [],
    active: null,
    frontier: [...queue],
    treeEdges: [],
    consideredEdge: null,
    rejectedEdges: [],
    table: table(),
  });

  while (queue.length > 0) {
    const current = queue.shift()!;
    output.push(current);

    const readyNow: string[] = [];
    for (const { to } of adj.get(current) ?? []) {
      treeEdges.push(edgeKey(current, to, directed));
      const next = (inDegree.get(to) ?? 0) - 1;
      inDegree.set(to, next);
      if (next === 0) {
        queue.push(to);
        readyNow.push(to);
      }
    }

    steps.push({
      caption:
        readyNow.length > 0
          ? `Take ${current} off the queue and emit it. ${formatList(readyNow)} ${readyNow.length === 1 ? "loses" : "lose"} its last dependency, so ${readyNow.length === 1 ? "it joins" : "they join"} the queue.`
          : `Take ${current} off the queue and emit it. Nothing becomes newly ready.`,
      visited: [...output],
      active: current,
      frontier: [...queue],
      treeEdges: [...treeEdges],
      consideredEdge: null,
      rejectedEdges: [],
      table: table(),
    });
  }

  const stuck = graph.nodes.map((n) => n.id).filter((id) => !output.includes(id));

  steps.push({
    caption:
      stuck.length === 0
        ? `Every node is emitted: ${output.length} out of ${output.length}. The graph has no cycle, and this order is a valid one.`
        : `The queue emptied with ${stuck.length} node${stuck.length === 1 ? "" : "s"} still stuck: ${formatList(stuck)}. ${stuck.length === 1 ? "It" : "They"} never reached in-degree 0, which only happens to a node sitting inside a cycle, or downstream of one. No topological order exists.`,
    visited: [...output],
    active: null,
    frontier: [],
    treeEdges: [...treeEdges],
    consideredEdge: null,
    rejectedEdges: [],
    table: table(),
    groups: stuck.length > 0 ? [stuck] : undefined,
  });

  return steps;
}
