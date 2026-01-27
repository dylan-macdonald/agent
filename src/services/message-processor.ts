/**
 * Message Processor Service
 *
 * Parses user messages to extract intents and entities
 */

import {
  Intent,
  EntityType,
  Entity,
  ProcessingResult,
  CommandDefinition,
} from "../types/processor.js";

export class MessageProcessor {
  private commands: Map<string, CommandDefinition> = new Map();

  constructor() {
    this.registerDefaultCommands();
  }

  /**
   * Register default system commands
   */
  private registerDefaultCommands(): void {
    const defaultCommands: CommandDefinition[] = [
      {
        name: "remind",
        intent: Intent.REMIND,
        description: "Set a reminder",
        usage: "/remind [task] at [time]",
        aliases: ["r"],
      },
      {
        name: "log",
        intent: Intent.LOG,
        description: "Log health data (food, sleep, exercise)",
        usage: "/log [type] [value]",
        aliases: ["l"],
      },
      {
        name: "goal",
        intent: Intent.GOAL,
        description: "Track or update a goal",
        usage: "/goal [title] [progress]",
        aliases: ["g"],
      },
      {
        name: "help",
        intent: Intent.HELP,
        description: "Show available commands",
        usage: "/help",
        aliases: ["h", "?"],
      },
      {
        name: "status",
        intent: Intent.STATUS,
        description: "Check system or goal status",
        usage: "/status",
      },
      {
        name: "search",
        intent: Intent.WEB_SEARCH,
        description: "Search the web",
        usage: "/search [query]",
        aliases: ["s"],
      },
      {
        name: "calc",
        intent: Intent.CALCULATE,
        description: "Calculate an expression",
        usage: "/calc [expression]",
        aliases: ["c", "math"],
      },
      {
        name: "run",
        intent: Intent.RUN_SCRIPT,
        description: "Run a script",
        usage: "/run [script]",
        aliases: ["script", "eval"],
      },
      {
        name: "modify",
        intent: Intent.SELF_MODIFY,
        description: "Propose a self-modification (requires SMS verification)",
        usage: "/modify [action] [args...]",
        aliases: ["selfmod", "self-modify", "upgrade"],
      },
      {
        name: "verify-mod",
        intent: Intent.SELF_MODIFY_VERIFY,
        description: "Verify a pending self-modification with code",
        usage: "/verify-mod [code]",
        aliases: ["approve-mod", "confirm-mod"],
      },
    ];

    for (const cmd of defaultCommands) {
      this.commands.set(cmd.name, cmd);
      if (cmd.aliases) {
        for (const alias of cmd.aliases) {
          this.commands.set(alias, cmd);
        }
      }
    }
  }

  /**
   * Process a message text
   */
  public async process(text: string): Promise<ProcessingResult> {
    const trimmedText = text.trim();

    // Check if it's a command
    if (trimmedText.startsWith("/")) {
      return this.processCommand(trimmedText);
    }

    // Process as natural language
    return this.processNaturalLanguage(trimmedText);
  }

  /**
   * Process a command message (starting with /)
   */
  private processCommand(text: string): ProcessingResult {
    const parts = text.substring(1).split(/\s+/);
    const commandName = parts[0]?.toLowerCase() ?? "";
    const commandArgs = parts.slice(1).join(" ");

    const command = this.commands.get(commandName);

    if (!command) {
      return {
        text,
        intent: Intent.UNKNOWN,
        confidence: 1.0,
        entities: [],
        isCommand: true,
        command: commandName,
      };
    }

    // Basic entity extraction from command args (placeholder)
    const entities = this.extractBasicEntities(commandArgs);

    return {
      text,
      intent: command.intent,
      confidence: 1.0,
      entities,
      isCommand: true,
      command: commandName,
    };
  }

  /**
   * Process natural language message
   */
  private processNaturalLanguage(text: string): ProcessingResult {
    const lowerText = text.toLowerCase();

    // Simple keyword-based intent detection
    let intent = Intent.UNKNOWN;
    let confidence = 0.5;

    const containsWord = (word: string) =>
      new RegExp(`\\b${word}\\b`, "i").test(text);

    if (
      lowerText.includes("remind me") ||
      lowerText.includes("remember to") ||
      containsWord("remind")
    ) {
      intent = Intent.REMIND;
      confidence = 0.8;
    } else if (
      containsWord("goal") ||
      containsWord("progress") ||
      containsWord("tracking")
    ) {
      intent = Intent.GOAL;
      confidence = 0.7;
    } else if (
      containsWord("status") ||
      lowerText.includes("how am i") ||
      lowerText.includes("how's it going") ||
      lowerText.includes("check in") ||
      lowerText.includes("briefing")
    ) {
      intent = Intent.STATUS;
      confidence = 0.8;
    } else if (lowerText.includes('slept') || lowerText.includes('sleep log')) {
      intent = Intent.SLEEP_LOG;
      confidence = 0.85;
    } else if (
      (lowerText.includes('workout') || lowerText.includes('gym') || lowerText.includes('exercise')) &&
      (containsWord('log') || containsWord('tracked') || containsWord('did') || containsWord('went') || /\d+/.test(text))
    ) {
      intent = Intent.WORKOUT_LOG;
      confidence = 0.85;
    } else if (
      (containsWord('ran') || containsWord('jogged') || containsWord('running')) &&
      (/\d+\s*(?:mile|km|min|hour)/.test(lowerText) || containsWord('log'))
    ) {
      // Only match "run/ran" if it has distance/time OR "log"
      intent = Intent.WORKOUT_LOG;
      confidence = 0.85;
    } else if (lowerText.includes('meditate') || lowerText.includes('mindfulness') || lowerText.includes('breath')) {
      intent = Intent.MEDITATE;
      confidence = 0.85;
    } else if (
      containsWord("log") ||
      containsWord("ate") ||
      containsWord("tracked")
    ) {
      intent = Intent.LOG;
      confidence = 0.7;
    } else if (
      containsWord("log") ||
      containsWord("ate") ||
      containsWord("tracked")
    ) {
      intent = Intent.LOG;
      confidence = 0.7;
    } else if (
      containsWord("yes") ||
      containsWord("sure") ||
      containsWord("ok") ||
      containsWord("okay") ||
      containsWord("approve") ||
      containsWord("confirm")
    ) {
      intent = Intent.CONFIRM;
      confidence = 0.9;
    } else if (
      containsWord("no") ||
      containsWord("cancel") ||
      containsWord("deny") ||
      containsWord("reject") ||
      lowerText === "n"
    ) {
      intent = Intent.DENY;
      confidence = 0.9;
    }

    // Vision: "look at this", "what is on my screen", "read screen"
    if (
      lowerText.includes("look at this") ||
      lowerText.includes("on my screen") ||
      lowerText.includes("on the screen") ||
      lowerText.startsWith("read this")
    ) {
      return {
        text,
        intent: Intent.VISION_QUERY,
        entities: [{ type: EntityType.QUERY, value: text, original: text, startIndex: 0, endIndex: text.length }],
        confidence: 0.9,
        isCommand: false,
      };
    } else if (
      lowerText.includes("help") ||
      lowerText.includes("commands") ||
      lowerText.includes("what can you do") ||
      lowerText.includes("start over")
    ) {
      return {
        text,
        intent: Intent.HELP,
        entities: [],
        confidence: 0.8,
        isCommand: false,
      };
    }

    // Calendar: "schedule", "meeting", "appointment"
    else if (
      lowerText.includes("schedule") ||
      lowerText.includes("meeting") ||
      lowerText.includes("appointment") ||
      lowerText.startsWith("remind me to meet") // overlaps with remind?
    ) {
      return {
        text,
        intent: Intent.CALENDAR_EVENT,
        entities: this.extractBasicEntities(text),
        confidence: 0.85,
        isCommand: false,
      };
    }

    // Self-modify: "update yourself", "modify your code", "improve yourself"
    else if (
      lowerText.includes("update yourself") ||
      lowerText.includes("modify your code") ||
      lowerText.includes("modify yourself") ||
      lowerText.includes("improve yourself") ||
      lowerText.includes("upgrade yourself") ||
      lowerText.includes("change your code") ||
      lowerText.includes("self-modify") ||
      lowerText.includes("selfmod")
    ) {
      return {
        text,
        intent: Intent.SELF_MODIFY,
        entities: this.extractBasicEntities(text),
        confidence: 0.9,
        isCommand: false,
      };
    }

    // Self-modify verification: 6-digit code pattern in context of approval
    else if (
      /\b\d{6}\b/.test(text) &&
      (lowerText.includes("verify") ||
        lowerText.includes("approve") ||
        lowerText.includes("confirm") ||
        lowerText.includes("code"))
    ) {
      const codeMatch = text.match(/\b(\d{6})\b/);
      return {
        text,
        intent: Intent.SELF_MODIFY_VERIFY,
        entities: codeMatch
          ? [
              {
                type: EntityType.CODE,
                value: codeMatch[1],
                original: codeMatch[0],
                startIndex: codeMatch.index || 0,
                endIndex: (codeMatch.index || 0) + codeMatch[0].length,
              },
            ]
          : [],
        confidence: 0.85,
        isCommand: false,
      };
    }

    // Web Search: "search for X", "who is X"
    if (
      lowerText.startsWith("search for") ||
      lowerText.includes("web search") ||
      lowerText.startsWith("who is") ||
      (lowerText.startsWith("what is") && !lowerText.includes("+") && !lowerText.includes("*")) // Simple check to avoid math
    ) {
      intent = Intent.WEB_SEARCH;
      confidence = 0.8;
    } else if (
      lowerText.startsWith("calculate") ||
      lowerText.startsWith("solve") ||
      (lowerText.match(/[\d\.]+\s*[\+\-\*\/]\s*[\d\.]+/) && !lowerText.includes("search")) // Simple math detection
    ) {
      intent = Intent.CALCULATE;
      confidence = 0.85;
    }

    const entities = this.extractBasicEntities(text);

    return {
      text,
      intent,
      confidence,
      entities,
      isCommand: false,
    };
  }

  /**
   * Basic entity extraction using regex (placeholder for more advanced NLP/LLM)
   */
  private extractBasicEntities(text: string): Entity[] {
    const entities: Entity[] = [];

    // Extract times (HH:MM or HH:MM am/pm)
    const timeRegex = /\b(\d{1,2}(?::\d{2})?\s*(?:am|pm|AM|PM)?)\b/g;
    let match;
    while ((match = timeRegex.exec(text)) !== null) {
      entities.push({
        type: EntityType.TIME,
        value: match[0],
        original: match[0],
        startIndex: match.index,
        endIndex: match.index + match[0].length,
      });
    }

    // Extract numbers (values)
    const numberRegex = /\b(\d+(?:\.\d+)?)(?!\s*am|pm|AM|PM)\b/g;
    while ((match = numberRegex.exec(text)) !== null) {
      // Avoid matching times again
      if (
        entities.some(
          (e) =>
            e.startIndex <= match!.index &&
            e.endIndex >= match!.index + match![0].length
        )
      ) {
        continue;
      }
      entities.push({
        type: EntityType.VALUE,
        value: match[0],
        original: match[0],
        startIndex: match.index,
        endIndex: match.index + match[0].length,
      });
    }

    // Extract task/content based on intent keywords (simple heuristic)
    const lowerText = text.toLowerCase();
    const taskKeywords = [
      "remind me to ",
      "remember to ",
      "remind me ",
      "remind ",
      "set a goal to ",
      "goal to ",
      "aim to "
    ];
    for (const kw of taskKeywords) {
      if (lowerText.includes(kw)) {
        const startIndex = lowerText.indexOf(kw) + kw.length;
        // Find if there's a time entity that follows
        const followingTime = entities.find(
          (e) => e.type === EntityType.TIME && e.startIndex > startIndex
        );
        const endIndex = followingTime ? followingTime.startIndex : text.length;

        let taskValue = text.substring(startIndex, endIndex).trim();
        // Remove common separators
        taskValue = taskValue
          .replace(/^at\s+/i, "")
          .replace(/\s+at$/i, "")
          .trim();

        if (taskValue) {
          entities.push({
            type: EntityType.TASK,
            value: taskValue,
            original: taskValue,
            startIndex,
            endIndex: startIndex + taskValue.length,
          });
        }
        break;
      }
    }

    return entities;
  }

  /**
   * Format a response for SMS (handling character limits)
   */
  public formatResponse(text: string): string {
    // SMS standard limit is 160, but Twilio handles concatenation up to 1600.
    // However, we should still try to be concise.
    if (text.length <= 160) {
      return text;
    }

    // If it's too long, maybe summarize?
    // For now, just return as is, since SmsService handles chunking.
    return text;
  }

  /**
   * Generate help text
   */
  public getHelpText(): string {
    let help = "Available Commands:\n";
    const uniqueCommands = new Set(this.commands.values());
    for (const cmd of uniqueCommands) {
      help += `${cmd.usage} - ${cmd.description}\n`;
    }
    return help.trim();
  }
}
