# Installation

| Plugin Version | Minimum Firebot Version |
| --- | --- |
| 0.0.1+ | 5.64 |

## Installation: Plugin

1. Enable custom scripts in Firebot (**Settings** > **Scripts**) if you have not already done so.
2. From the latest [Release](https://github.com/TheStaticMage/firebot-disabled-effect-finder/releases), download `firebot-disabled-effect-finder-<version>.js` into your Firebot scripts directory (File > Open Data Folder, then select the `scripts` directory). :warning: Download from the releases page, not the source code.
3. Go to **Settings** > **Scripts** > **Manage Startup Scripts** > **Add New Script** and add the `firebot-disabled-effect-finder-<version>.js` script.
4. Restart Firebot. The plugin will not load until you restart Firebot.

## Configuration: Preset Effect List

1. Download [`disabled-effect-finder.firebotsetup`](/disabled-effect-finder.firebotsetup).
2. In Firebot, go to File > Firebot Setups > Import Firebot Setup and import the file you downloaded.
3. Run the "Disabled Effect Finder" preset effect list to print disabled effects to chat and confirm what should remain off.

## Optional Testing

Run the preset effect list from the Preset Effect List screen and confirm it reports any effects you intentionally disabled. That verifies the plugin is scanning your setup.
