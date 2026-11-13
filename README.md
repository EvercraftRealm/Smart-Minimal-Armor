# Smart Minimal Armor

Smart Minimal Armor is a Minecraft Bedrock add-on that lets players opt into minimal armor visuals without replacing the underlying vanilla armor item.

## Gameplay

- Fill a cauldron with any drinkable invisibility potion while this add-on is active.
- Use a supported armor item on that potion cauldron to mark it as minimal.
- Use marked armor on a water cauldron to restore its normal appearance.
- Minimal armor receives a gray `Minimal` lore line; washing removes only that add-on marker and preserves other lore.
- Each successful dip consumes one bottle-sized cauldron dose (2 of 6 fill units).
- The armor remains the same vanilla `ItemStack`, preserving enchantments, durability, names, lore, dye color, armor trims, and other stack data.

Supported materials: leather, chainmail, copper, gold, iron, diamond, netherite, and turtle shell.

## Installation

Import the versioned `.mcaddon` from `dist` into Minecraft Bedrock Edition and activate the behavior pack. Its resource-pack dependency should activate the matching visuals automatically.

The add-on uses stable Script API features and does not require cheats or experimental toggles. Final achievement behavior should still be verified in a disposable Survival world on the target Minecraft version.

The resource pack declares the `pbr` capability so Minecraft can keep Vibrant Visuals enabled while using the pack. It relies on Minecraft's default PBR material values.

## Important compatibility notes

- BedrockUnplugged ghosts tagged `unplugged.bot` are ignored, and all player event/query results are checked before use. This compatibility requires Minecraft 1.26.60 or newer and `@minecraft/server` 2.10.0.
- Armor rendering properties are synchronized on spawn and equipment-change events; SMA does not continuously poll connected players.
- This pack overrides the vanilla player behavior definition to add four client-synchronized rendering properties. Other behavior packs that replace `minecraft:player` may conflict.
- The resource pack overrides only the vanilla third-person player and Persona render-controller definitions needed to keep outer hair layers visible with minimal helmets.
- Minimal rendering currently targets player-worn armor. Armor stands and mobs continue to use normal armor visuals.
- The inventory icon stays vanilla because Bedrock does not expose per-stack dynamic properties to item-icon selection. A distinct icon would require replacing the armor with custom item identifiers.
- Minimal mode changes the worn armor geometry while continuing to use Minecraft's own active armor texture, including its composed trim texture. Trim metadata is never rewritten.
- No textures or other assets from CountXD's pack are included in this project or its generated add-on.
- A cauldron is recognized as invisibility potion after the add-on observes an invisibility potion being poured into it. Potion cauldrons that already existed before activating the pack must be emptied and refilled.

## Development layout

- `packs/Smart_Minimal_Armor_BP` — behavior pack and script
- `packs/Smart_Minimal_Armor_RP` — resource pack, attachables, and original minimal geometry
- `SOURCE_ASSETS.md` — source provenance and asset-independence notes

## Build

Run `npm run check` to type-check the script and `npm run build` to validate and package matching behavior/resource packs in `dist`.

