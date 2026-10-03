import * as fs from "node:fs";
import * as path from "node:path";
import { type SubagentDefinition } from "./types.ts";

export class AgentRegistry {
  private agentsDir: string;
  private definitions: Map<string, SubagentDefinition> = new Map();

  constructor(agentsDir?: string) {
    this.agentsDir = agentsDir || path.join(process.cwd(), "agents");
    this.loadAll();
  }

  private parseAgentFile(filePath: string): SubagentDefinition | null {
    if (!fs.existsSync(filePath)) return null;
    const content = fs.readFileSync(filePath, "utf8");

    // Match YAML frontmatter between --- and ---
    const fmMatch = content.match(/^---\r?\n([\s\S]*?)\r?\n---\r?\n([\s\S]*)$/);
    if (!fmMatch) {
      return null;
    }

    const frontmatterRaw = fmMatch[1];
    const body = fmMatch[2].trim();

    const nameMatch = frontmatterRaw.match(/^name:\s*(.+)$/m);
    const descMatch = frontmatterRaw.match(/^description:\s*(.+)$/m);
    const toolsMatch = frontmatterRaw.match(/^tools:\s*(.+)$/m);
    const modelMatch = frontmatterRaw.match(/^model:\s*(.+)$/m);

    const name = nameMatch ? nameMatch[1].trim() : path.basename(filePath, ".md");
    const description = descMatch ? descMatch[1].trim() : "";
    const tools = toolsMatch ? toolsMatch[1].split(",").map((t) => t.trim()) : [];
    const model = modelMatch ? modelMatch[1].trim() : undefined;

    return {
      name,
      description,
      tools,
      model,
      systemPrompt: body,
    };
  }

  public loadAll(): void {
    if (!fs.existsSync(this.agentsDir)) return;
    const files = fs.readdirSync(this.agentsDir);
    for (const file of files) {
      if (file.endsWith(".md")) {
        const fullPath = path.join(this.agentsDir, file);
        const def = this.parseAgentFile(fullPath);
        if (def) {
          this.definitions.set(def.name, def);
        }
      }
    }
  }

  public get(name: string): SubagentDefinition | undefined {
    return this.definitions.get(name);
  }

  public getAll(): SubagentDefinition[] {
    return Array.from(this.definitions.values());
  }

  public register(def: SubagentDefinition): void {
    this.definitions.set(def.name, def);
  }
}
