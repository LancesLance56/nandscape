import type { Command } from "./command";

export class CommandRegistry {
  private commands = new Map<string, Command<unknown>>();

  register<T>(command: Command<T>): void {
    if (this.commands.has(command.id)) {
      console.warn(`CommandRegistry: overwriting existing command "${command.id}"`);
    }
    this.commands.set(command.id, command as Command<unknown>);
  }

  registerAll(commands: Command<unknown>[]): void {
    for (const command of commands) this.register(command);
  }

  get<T = unknown>(id: string): Command<T> | undefined {
    return this.commands.get(id) as Command<T> | undefined;
  }

  has(id: string): boolean {
    return this.commands.has(id);
  }

  list(): Command<unknown>[] {
    return Array.from(this.commands.values());
  }
}

/** Process-wide singleton — one editor instance per tab, so this is safe. */
export const commandRegistry = new CommandRegistry();
