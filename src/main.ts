import { Firebot, RunRequest } from '@crowbartools/firebot-custom-scripts-types';
import { DisabledEffectsVariable } from './variable';

const scriptVersion = '0.0.1';

const script: Firebot.CustomScript = {
    getScriptManifest: () => {
        return {
            name: 'Disabled Effect Finder',
            description: 'Find disabled effects in your Firebot setup',
            author: 'The Static Mage',
            version: scriptVersion,
            startupOnly: true,
            firebotVersion: '5'
        };
    },
    getDefaultParameters: () => {
        return {};
    },
    run: (runRequest: RunRequest<any>) => {
        const disabledEffectsVariable = new DisabledEffectsVariable(runRequest);
        disabledEffectsVariable.registerVariables();
    }
};

export default script;
