# Firebot Disabled Effect Finder

## Introduction

This helps you find effects that are disabled in your [Firebot](https://firebot.app) setup.

Have you ever disabled certain effects for testing purposes but forgotten to re-enable them before you started your stream? I sure have, which is why I created this plugin. It provides a Firebot variable with all of the disabled effects across events, preset effect lists, and more. I use this variable along with effects (in my case, loops and chat feed alerts) this to verify that I really _do_ want those effects disabled before I go live.

This currently detects disabled effects in:

- Channel rewards
- Custom commands
- Events
- Preset effect lists
- Scheduled tasks
- Timers

## Installation

1. From the latest [Release](https://github.com/TheStaticMage/firebot-disabled-effect-finder/releases), download `firebot-disabled-effect-finder-<version>.js` into your Firebot scripts directory

    (File &gt; Open Data Folder, then select the "scripts" directory)

    :warning: Be sure you download the file from the releases page, not the source code of the GitHub repository!

2. Enable custom scripts in Firebot (Settings &gt; Scripts) if you have not already done so.

3. Go to Settings &gt; Scripts &gt; Manage Startup Scripts &gt; Add New Script and add the `firebot-disabled-effect-finder-<version>.js` script.

4. Restart Firebot. (The script will _not_ be loaded until you actually restart Firebot.)

## Usage

The easiest way to get started with this is to import my "Disabled Effect Finder" preset effect list:

1. Download [`disabled-effect-finder.firebotsetup`](/disabled-effect-finder.firebotsetup) and save it to a place where you can easily find it.

2. In Firebot, go to File &gt; Import Firebot Setup. Select the setup file you just downloaded and follow the prompts to install.

You can now run the preset effect list by clicking the "play" button in the Preset Effect List screen.

On my system, I added this Present Effect List to the "Firebot Started" event so I see the output each time I start the program. The importable setup doesn't do this, because I leave it up to you to decide when you want to see the output and how you want to trigger the report.

## Support

The best way to get help is to join our Discord community in [The Static Family](https://discord.gg/yZCWzNSEe9) and head to the `#firebot-disabled-effect-finder` channel.

- Please do not DM me on Discord.
- Please do not ask for help in my chat when I am live on Twitch.

Bug reports and feature requests are welcome via [GitHub Issues](https://github.com/TheStaticMage/firebot-disabled-effect-finder/issues).

## Contributions

Contributions are welcome via [Pull Requests](https://github.com/TheStaticMage/firebot-disabled-effect-finder/pulls). I _strongly suggest_ that you contact me before making significant changes, because I'd feel really bad if you spent a lot of time working on something that is not consistent with my vision for the project. Please refer to the [Contribution Guidelines](/.github/contributing.md) for specifics.

## License

This project is released under the [GNU General Public License version 3](/LICENSE).
