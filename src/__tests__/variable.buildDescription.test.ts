import { DisabledEffectsVariable } from '../variable';

describe('DisabledEffectsVariable.buildDescription', () => {
    // Mock dependencies
    const mockFirebot: any = {
        modules: {
            logger: {
                debug: jest.fn(),
                error: jest.fn(),
                warn: jest.fn(),
                info: jest.fn()
            },
            path: {
                join: (...args: string[]) => args.join('/'),
                resolve: (...args: string[]) => args.join('/')
            },
            effectManager: {
                getEffectById: jest.fn()
            },
            replaceVariableManager: {
                registerReplaceVariable: jest.fn()
            }
        }
    };

    const variable = new DisabledEffectsVariable(mockFirebot);

    it('should build a description string with all parts', () => {
        const item = {
            effect: {},
            effectName: 'Test Effect',
            index: 2,
            source: [
                { key: 'event', id: 'event', title: 'Event' },
                { key: 'mainEvents', id: '123', title: 'Main Event' },
                { key: 'groups', id: '456', title: 'Group Name' }
            ]
        };
        const result = (variable as any).buildDescription(item);
        expect(result).toBe('Event > Main Event > Group Name > #3. Test Effect');
    });

    it('should skip falsy types in the description', () => {
        const item = {
            effect: {},
            effectName: 'No Title',
            index: 0,
            source: [
                { key: 'event', id: 'event', title: 'Event' },
                { key: 'mainEvents', id: '123', title: 'My Event' },
                { key: 'groups', id: '', title: '' }
            ]
        };
        const result = (variable as any).buildDescription(item);
        expect(result).toBe('Event > My Event > #1. No Title');
    });

    it('should handle empty sources array', () => {
        const item = {
            effect: {},
            effectName: 'Missing Sources',
            index: 1,
            source: [
                { key: 'event', id: 'event', title: 'Event' }
            ]
        };
        const result = (variable as any).buildDescription(item);
        expect(result).toBe('Event > #2. Missing Sources');
    });
});
