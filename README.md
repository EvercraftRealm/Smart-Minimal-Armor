# Smart Minimal Armor

Smart Minimal Armor is a Minecraft Bedrock add-on that lets players opt into minimal armor visuals without replacing the underlying vanilla armor item.

## Gameplay

- Fill a cauldron with any drinkable invisibility potion while this add-on is active.
- Use a supported armor item on that potion cauldron to mark it as minimal.
- Use marked armor on a water cauldron to restore its normal appearance.
- Minimal armor receives a gray `Minimal` lore line; washing removes only that status.
- Each successful dip consumes one bottle-sized cauldron dose.
- The armor remains the same vanilla `ItemStack`, preserving enchantments, durability, names, lore, dye color, armor trims, and other stack data.

Supported materials: leather, chainmail, copper, gold, iron, diamond, netherite, and turtle shell.

## Installation

Download and import the versioned `.mcaddon` from the latest GitHub release, then activate the behavior pack. Its resource-pack dependency should activate the matching visuals automatically.

The add-on uses stable Script API features and does not require cheats or experimental toggles.

## Important compatibility notes

- This pack overrides the vanilla player behavior definition to add four client-synchronized rendering properties. Other behavior packs that replace `minecraft:player` may conflict.
- The resource pack overrides only the vanilla third-person player and Persona render-controller definitions needed to keep outer hair layers visible with minimal helmets.
- Minimal rendering currently targets player-worn armor. Armor stands and mobs continue to use normal armor visuals.
- The inventory icon stays vanilla because Bedrock does not expose per-stack dynamic properties to item-icon selection.
- A cauldron is recognized as invisibility potion after the add-on observes an invisibility potion being poured into it. Potion cauldrons that already existed before activating the pack must be emptied and refilled.
