import { RunRequest } from '@crowbartools/firebot-custom-scripts-types';
import { Effects } from "@crowbartools/firebot-custom-scripts-types/types/effects";
import { Logger } from '@crowbartools/firebot-custom-scripts-types/types/modules/logger';
import { ReplaceVariable } from '@crowbartools/firebot-custom-scripts-types/types/modules/replace-variable-manager';
import NodeCache from 'node-cache';
import { JsonDB } from "node-json-db";

declare const SCRIPTS_DIR: string; // For getProfileDirectory to work

interface EffectSourceInfo {
    id: string;
    title: string;
    index?: number;
}

interface IndexedEffect {
    effect: Effects.Effect;
    effectName: string;
    index: number;
}

interface IndexedEffectWithSource extends IndexedEffect {
    source: Map<string, EffectSourceInfo>;
}

interface EffectSourceDefinition {
    key: string;
    effectList: () => Promise<IndexedEffectWithSource[]>;
    name: string;
}

export class DisabledEffectsVariable {
    private disabledEffectsVariable: ReplaceVariable = {
        definition: {
            handle: "disabledEffects",
            examples: [
                {
                    usage: "disabledEffects",
                    description: "Returns a list of all disabled effects as an array of strings."
                },
                {
                    usage: "disabledEffects[events]",
                    description: "Returns a list of all disabled effects within events as an array of strings."
                }
            ],
            description: "Gets the effects that are disabled in your Firebot setup.",
            categories: ["common"],
            possibleDataOutput: ["array"]
        },
        evaluator: async (_, eventType = "") => {
            try {
                const results = await this.findDisabledEvents();
                const filteredResults = results.filter(item => eventType === "" || item.source.has(eventType));
                this.logger.debug(`disabledEffects found ${filteredResults.length} disabled effects for event type '${eventType}'.`);
                return filteredResults.map(item => this.buildDescription(item));
            } catch (error) {
                this.logger.warn(`There was an error evaluating the disabledEffects variable: ${String(error)}`);
                return [];
            }
        }
    };

    private disabledEffectsRawVariable: ReplaceVariable = {
        definition: {
            handle: "disabledEffectsRaw",
            description: "Gets the effects that are disabled in your Firebot setup as a JSON array (see documentation).",
            categories: ["common"],
            possibleDataOutput: ["array"]
        },
        evaluator: async () => {
            try {
                const results = await this.findDisabledEvents();
                this.logger.debug(`disabledEffectsRaw found ${results.length} disabled effects.`);

                // The map in results[].source does not serialize to JSON.
                // Create a record with keys and values, and an array with the
                // ordered entries.
                const serializedResults = results.map((item) => {
                    // Destructure to exclude 'source'
                    const { source, ...rest } = item;
                    return {
                        ...rest,
                        sourceMap: Object.fromEntries(source),
                        sourceList: Array.from(source.entries()).map(([key, value]) => ({ key, ...value }))
                    };
                });

                return serializedResults;
            } catch (error) {
                this.logger.warn(`There was an error evaluating the disabledEffectsRaw variable: ${String(error)}`);
                return [];
            }
        }
    };

    private effectSources: EffectSourceDefinition[] = [
        {
            key: "events", // We're combining the main events and grouped events into a single entry
            name: "Events",
            effectList: async (): Promise<IndexedEffectWithSource[]> => {
                return new Promise((resolve, reject) => {
                    const eventsDb = this.getJsonDb("events/events.json");
                    try {
                        const result: IndexedEffectWithSource[] = [];
                        const eventsData = eventsDb.getData("/");

                        // Main events
                        if (eventsData.mainEvents && Array.isArray(eventsData.mainEvents)) {
                            const baseSource = new Map<string, EffectSourceInfo>([
                                ['top', { id: 'event', title: 'Event' }]
                            ]);
                            const getIdFunction = (item: any) => item.eventId;
                            const getTitleFunction = (item: any) => item.name;
                            result.push(...this.findDisabledEventsHelper(
                                eventsData.mainEvents,
                                baseSource,
                                'event',
                                getIdFunction,
                                getTitleFunction
                            ));
                        }

                        // Group events
                        if (eventsData.groups && typeof eventsData.groups === 'object' && !Array.isArray(eventsData.groups)) {
                            // If groups is a map/object, iterate its values
                            Object.keys(eventsData.groups).forEach((key: string, gIndex: number) => {
                                const group = eventsData.groups[key];
                                if (!group.active) {
                                    return;
                                }

                                if (group.events && Array.isArray(group.events)) {
                                    const baseSource = new Map<string, EffectSourceInfo>([
                                        ['top', { id: 'event', title: 'Event' }],
                                        ['group', { id: group.id, title: group.name || "<unknown group>", index: gIndex }]
                                    ]);
                                    const getIdFunction = (item: any) => item.eventId;
                                    const getTitleFunction = (item: any) => item.name;
                                    result.push(...this.findDisabledEventsHelper(
                                        group.events,
                                        baseSource,
                                        'event',
                                        getIdFunction,
                                        getTitleFunction
                                    ));
                                }
                            });
                        }
                        resolve(result);
                    } catch (error) {
                        this.logger.warn(`There was an error reading events data file: ${String(error)}`);
                        reject(error);
                    }
                });
            }
        },
        {
            key: "presetEffectLists",
            name: "Preset Effect Lists",
            effectList: async (): Promise<IndexedEffectWithSource[]> => {
                return new Promise((resolve, reject) => {
                    const presetEffectListsDb = this.getJsonDb("effects/preset-effect-lists.json");
                    try {
                        const result: IndexedEffectWithSource[] = [];
                        const data = presetEffectListsDb.getData("/");
                        const dataArray = Object.entries(data).map(([key, value]) => ({
                            ...(typeof value === 'object' && value !== null ? value : {}),
                            id: key
                        }));

                        const baseSource = new Map<string, EffectSourceInfo>([
                            ['top', { id: 'presetEffectList', title: 'Preset Effect List' }]
                        ]);
                        const getIdFunction = (item: any) => item.id;
                        const getTitleFunction = (item: any) => item.name;
                        result.push(...this.findDisabledEventsHelper(
                            dataArray,
                            baseSource,
                            'presetEffectList',
                            getIdFunction,
                            getTitleFunction
                        ));
                        resolve(result);
                    } catch (error) {
                        this.logger.warn(`There was an error reading preset effect lists data file: ${String(error)}`);
                        reject(error);
                    }
                });
            }
        },
        {
            key: "commands",
            name: "Commands",
            effectList: async (): Promise<IndexedEffectWithSource[]> => {
                return new Promise((resolve, reject) => {
                    const dbKeys: Record<string, string> = {
                        "customCommands": "Custom Commands"
                        // System commands are defined as overrides. Not figuring those out right now.
                    };
                    const commandsDb = this.getJsonDb("chat/commands.json");
                    for (const dbKey of Object.keys(dbKeys)) {
                        try {
                            const result: IndexedEffectWithSource[] = [];
                            const data = commandsDb.getData(`/${dbKey}`);
                            const dataArray = Object.entries(data).map(([key, value]) => ({
                                ...(typeof value === 'object' && value !== null ? value : {}),
                                id: key
                            }));

                            const baseSource = new Map<string, EffectSourceInfo>([
                                ['top', { id: 'command', title: 'Command' }],
                                ['commandType', { id: dbKey, title: dbKeys[dbKey] }]
                            ]);
                            const getIdFunction = (item: any) => item.id;
                            const getTitleFunction = (item: any) => item.trigger;
                            result.push(...this.findDisabledEventsHelper(
                                dataArray,
                                baseSource,
                                'command',
                                getIdFunction,
                                getTitleFunction
                            ));
                            resolve(result);
                        } catch (error) {
                            this.logger.warn(`There was an error reading commands data file: ${String(error)}`);
                            reject(error);
                        }
                    }
                });
            }
        },
        {
            key: "channelRewards",
            name: "Channel Rewards",
            effectList: async (): Promise<IndexedEffectWithSource[]> => {
                return new Promise((resolve, reject) => {
                    const rewardsDb = this.getJsonDb("channel-rewards.json");
                    try {
                        const result: IndexedEffectWithSource[] = [];
                        const data = rewardsDb.getData(`/`);
                        const dataArray = Object.entries(data).map(([key, value]) => ({
                            ...(typeof value === 'object' && value !== null ? value : {}),
                            id: key
                        }));

                        const baseSource = new Map<string, EffectSourceInfo>([
                            ['top', { id: 'channelReward', title: 'Channel Reward' }]
                        ]);
                        const getIdFunction = (item: any) => item.id;
                        const getTitleFunction = (item: any) => item.twitchData?.title;
                        result.push(...this.findDisabledEventsHelper(
                            dataArray,
                            baseSource,
                            'channelReward',
                            getIdFunction,
                            getTitleFunction
                        ));
                        resolve(result);
                    } catch (error) {
                        this.logger.warn(`There was an error reading channel rewards data file: ${String(error)}`);
                        reject(error);
                    }
                });
            }
        },
        {
            key: "timers",
            name: "Timers",
            effectList: async (): Promise<IndexedEffectWithSource[]> => {
                return new Promise((resolve, reject) => {
                    const timersDb = this.getJsonDb("timers.json");
                    try {
                        const result: IndexedEffectWithSource[] = [];
                        const data = timersDb.getData(`/`);
                        const dataArray = Object.entries(data).map(([key, value]) => ({
                            ...(typeof value === 'object' && value !== null ? value : {}),
                            id: key
                        }));

                        const baseSource = new Map<string, EffectSourceInfo>([
                            ['top', { id: 'timer', title: 'Timer' }]
                        ]);
                        const getIdFunction = (item: any) => item.id;
                        const getTitleFunction = (item: any) => item.name;
                        result.push(...this.findDisabledEventsHelper(
                            dataArray,
                            baseSource,
                            'timer',
                            getIdFunction,
                            getTitleFunction
                        ));
                        resolve(result);
                    } catch (error) {
                        this.logger.warn(`There was an error reading timers data file: ${String(error)}`);
                        reject(error);
                    }
                });
            }
        },
        {
            key: "scheduledTasks",
            name: "Scheduled Tasks",
            effectList: async (): Promise<IndexedEffectWithSource[]> => {
                return new Promise((resolve, reject) => {
                    const rewardsDb = this.getJsonDb("scheduled-tasks.json");
                    try {
                        const result: IndexedEffectWithSource[] = [];
                        const data = rewardsDb.getData(`/`);
                        const dataArray = Object.entries(data).map(([key, value]) => ({
                            ...(typeof value === 'object' && value !== null ? value : {}),
                            id: key
                        }));

                        const baseSource = new Map<string, EffectSourceInfo>([
                            ['top', { id: 'scheduledTask', title: 'Scheduled Task' }]
                        ]);
                        const getIdFunction = (item: any) => item.id;
                        const getTitleFunction = (item: any) => item.name;
                        result.push(...this.findDisabledEventsHelper(
                            dataArray,
                            baseSource,
                            'scheduledTask',
                            getIdFunction,
                            getTitleFunction
                        ));
                        resolve(result);
                    } catch (error) {
                        this.logger.warn(`There was an error reading scheduled tasks data file: ${String(error)}`);
                        reject(error);
                    }
                });
            }
        }
    ];

    private cache: NodeCache = new NodeCache({ stdTTL: 1, checkperiod: 30 });
    private firebot: RunRequest<any>;
    private logger: LogWrapper;
    private profileDirectory: string;

    constructor(firebot: RunRequest<any>) {
        this.firebot = firebot;
        this.logger = new LogWrapper(firebot.modules.logger);

        // Only call getProfileDirectory if not in test environment
        if (process.env && process.env.NODE_ENV === 'test') {
            this.profileDirectory = '';
        } else {
            this.profileDirectory = this.getProfileDirectory();
        }
    }

    registerVariables(): void {
        const { replaceVariableManager } = this.firebot.modules;
        replaceVariableManager.registerReplaceVariable(this.disabledEffectsVariable);
        replaceVariableManager.registerReplaceVariable(this.disabledEffectsRawVariable);
    }

    private buildDescription(item: IndexedEffectWithSource): string {
        // Iterate over the Map in insertion order, using the title for each
        const parts = Array.from(item.source.values()).map(v => v.title).filter(Boolean);
        return `${parts.join(" > ")} > #${item.index + 1}. ${item.effectName}`;
    }

    private async findDisabledEvents(): Promise<IndexedEffectWithSource[]> {
        const cacheHit = this.cache.get<IndexedEffectWithSource[]>("findDisabledEvents");
        if (cacheHit) {
            this.logger.debug("findDisabledEvents using cached findDisabledEvents data.");
            return cacheHit;
        }

        const results: IndexedEffectWithSource[] = [];
        for (const source of this.effectSources) {
            results.push(...await source.effectList());
        }
        this.logger.debug(`findDisabledEvents found ${results.length} disabled effects across all sources.`);
        this.cache.set("findDisabledEvents", results);
        return results;
    }

    private findDisabledEventsHelper(
        input: any[],
        source: Map<string, EffectSourceInfo>,
        sourceKey: string,
        getIdFunction: (item: any) => string,
        getTitleFunction: (item: any) => string
    ): IndexedEffectWithSource[] {
        const result: IndexedEffectWithSource[] = [];
        input.forEach((item: any, index: number) => {
            if (!item.effects || !Array.isArray(item.effects.list)) {
                this.logger.warn(`No effects or effect list found for item at index ${index} in source ${sourceKey}.`);
                return;
            }

            const inactiveEvents = this.findDisabledEffectsInList(item.effects);
            if (inactiveEvents.length === 0) {
                return;
            }

            const sourceItem = { id: getIdFunction(item), title: getTitleFunction(item) || `<unknown ${sourceKey}>`, index: index };
            const newSource = new Map(source);
            newSource.set(sourceKey, sourceItem);
            result.push(...inactiveEvents.map(inactiveEvent => ({
                ...inactiveEvent,
                source: newSource
            })));
        });
        return result;
    }

    private findDisabledEffectsInList(effects: any): IndexedEffect[] {
        const result: IndexedEffect[] = [];
        if (effects && effects.list && Array.isArray(effects.list)) {
            effects.list.forEach((effect: any, index: number) => {
                if (effect.active) {
                    return;
                }
                result.push({
                    effect: effect,
                    effectName: this.getEffectName(effect.type),
                    index: index
                });
            });
        }
        return result;
    }

    private getEffectName(effectId: string): string {
        const { effectManager } = this.firebot.modules;
        const effect = effectManager.getEffectById(effectId);
        if (effect) {
            return effect.definition.name;
        }
        this.logger.warn(`Effect with ID ${effectId} not found.`);
        return effectId;
    }

    private getJsonDb(filepath: string, humanReadable = true): JsonDB {
        // If running in a test environment, always return an empty in-memory database
        if (process.env && process.env.NODE_ENV === 'test') {
            return new JsonDB(":memory:", true, humanReadable);
        }

        const cachedDb = this.cache.get<JsonDB>(`file:${filepath}`);
        if (cachedDb) {
            this.logger.debug(`Using cached JsonDB for ${filepath}`);
            return cachedDb;
        }

        const { path } = this.firebot.modules;
        const jsonDbPath = path.join(this.profileDirectory, filepath);

        try {
            const db = new JsonDB(jsonDbPath, false, humanReadable);
            db.load();
            this.logger.debug(`Loaded JsonDB at ${jsonDbPath}`);
            this.cache.set(`file:${filepath}`, db);
            return db;
        } catch (error) {
            this.logger.error(`Error loading JsonDB at ${jsonDbPath}: ${String(error)}. Detection of disabled events from this file will be skipped.`);
            // Return an in-memory JsonDB instance (not persisted to disk)
            return new JsonDB(":memory:", true, humanReadable);
        }
    }

    private getProfileDirectory(): string {
        // This is a total hack because the Firebot profile manager is not exposed to scripts. Sorry about this...
        const { path } = this.firebot.modules;
        return path.resolve(path.join(SCRIPTS_DIR, '..'));
    }
}

class LogWrapper {
    private logger: Logger;
    private prefix = "[firebot-disabled-effect-finder]";

    constructor(logger: Logger) {
        this.logger = logger;
    }

    debug(message: string): void {
        this.logger.debug(`${this.prefix} ${message}`);
    }

    error(message: string): void {
        this.logger.error(`${this.prefix} ${message}`);
    }

    warn(message: string): void {
        this.logger.warn(`${this.prefix} ${message}`);
    }

    info(message: string): void {
        this.logger.info(`${this.prefix} ${message}`);
    }
}
