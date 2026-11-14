import {
  EquipmentSlot,
  FluidType,
  GameMode,
  system,
  world,
} from "@minecraft/server";

const PACK_VERSION = "1.0.27";
const MINIMAL_PROPERTY = "sma:minimal";
const MINIMAL_LORE = "§7Minimal";
const CAULDRON_REGISTRY_PROPERTY = "sma:invisibility_cauldrons";
const ARMOR_CAULDRON_COST = 2;
const UNPLUGGED_BOT_TAG = "unplugged.bot";

const ARMOR_MATERIALS = [
  "leather",
  "chainmail",
  "copper",
  "golden",
  "iron",
  "diamond",
  "netherite",
];

const ARMOR_PIECES = ["helmet", "chestplate", "leggings", "boots"];

/** @type {ReadonlyArray<readonly [EquipmentSlot, string]>} */
const ARMOR_SLOT_PROPERTIES = [
  [EquipmentSlot.Head, "sma:minimal_head"],
  [EquipmentSlot.Chest, "sma:minimal_chest"],
  [EquipmentSlot.Legs, "sma:minimal_legs"],
  [EquipmentSlot.Feet, "sma:minimal_feet"],
];

const SUPPORTED_ARMOR = new Set([
  ...ARMOR_MATERIALS.flatMap((material) =>
    ARMOR_PIECES.map((piece) => `minecraft:${material}_${piece}`),
  ),
  "minecraft:turtle_helmet",
]);

let invisibilityCauldrons = loadCauldronRegistry();

console.info(`[Smart Minimal Armor] Loaded version ${PACK_VERSION}.`);

/**
 * @param {import("@minecraft/server").Entity | undefined} player
 * @returns {player is import("@minecraft/server").Player}
 */
function isReadableRealPlayer(player) {
  if (!player) return false;

  try {
    return (
      player.isValid &&
      player.typeId === "minecraft:player" &&
      !player.hasTag(UNPLUGGED_BOT_TAG)
    );
  } catch {
    return false;
  }
}

/** @param {import("@minecraft/server").Entity | undefined} player */
function syncPlayerArmorState(player) {
  if (!isReadableRealPlayer(player)) return;

  try {
    const equippable = player.getComponent("minecraft:equippable");
    if (!equippable) return;

    for (const [slot, propertyId] of ARMOR_SLOT_PROPERTIES) {
      const armor = equippable.getEquipment(slot);
      const minimal = armor?.getDynamicProperty(MINIMAL_PROPERTY) === true;
      if (player.getProperty(propertyId) !== minimal) {
        player.setProperty(propertyId, minimal);
      }
    }
  } catch (error) {
    console.warn(
      `[Smart Minimal Armor] Could not synchronize armor state: ${error}`,
    );
  }
}

/** @returns {Set<string>} */
function loadCauldronRegistry() {
  try {
    const saved = world.getDynamicProperty(CAULDRON_REGISTRY_PROPERTY);
    if (typeof saved !== "string" || saved.length === 0) return new Set();
    const values = JSON.parse(saved);
    if (!Array.isArray(values)) return new Set();

    return new Set(values.filter((value) => typeof value === "string"));
  } catch {
    return new Set();
  }
}

function saveCauldronRegistry() {
  try {
    world.setDynamicProperty(
      CAULDRON_REGISTRY_PROPERTY,
      JSON.stringify([...invisibilityCauldrons]),
    );
  } catch (error) {
    console.warn(
      `[Smart Minimal Armor] Could not save cauldron registry: ${error}`,
    );
  }
}

/** @param {import("@minecraft/server").Block} block */
function cauldronKey(block) {
  const { x, y, z } = block.location;
  return `${block.dimension.id}|${x},${y},${z}`;
}

/** @param {import("@minecraft/server").Block | undefined} block */
function isCauldron(block) {
  return (
    block?.typeId === "minecraft:cauldron" ||
    block?.typeId === "minecraft:lava_cauldron"
  );
}

/** @param {import("@minecraft/server").Block} block */
function getFluidContainer(block) {
  try {
    return block.getComponent("minecraft:fluid_container");
  } catch {
    return undefined;
  }
}

/** @param {import("@minecraft/server").ItemStack | undefined} itemStack */
function isInvisibilityPotion(itemStack) {
  try {
    const potion = itemStack?.getComponent("minecraft:potion");
    if (!potion) return false;
    const effectId = String(potion.potionEffectType?.id ?? "").toLowerCase();
    return effectId === "invisibility" || effectId.endsWith(":invisibility");
  } catch {
    return false;
  }
}

/**
 * @param {import("@minecraft/server").Player} player
 * @param {string} expectedTypeId
 * @param {boolean} minimal
 */
function setHeldMinimalState(player, expectedTypeId, minimal) {
  const inventory = player.getComponent("minecraft:inventory")?.container;
  if (!inventory) return false;

  const slot = player.selectedSlotIndex;
  const current = inventory.getItem(slot);
  if (
    !current ||
    current.typeId !== expectedTypeId ||
    !SUPPORTED_ARMOR.has(current.typeId)
  ) {
    return false;
  }

  const lore = current.getLore();
  const rawLore = current.getRawLore();
  if (minimal) {
    if (!lore.includes(MINIMAL_LORE)) {
      try {
        current.setLore([...rawLore, MINIMAL_LORE]);
      } catch (error) {
        console.warn(`[Smart Minimal Armor] Could not add Minimal lore: ${error}`);
      }
    }
  } else {
    const restoredLore = rawLore.filter(
      (_, index) => lore[index] !== MINIMAL_LORE,
    );
    if (restoredLore.length !== rawLore.length) current.setLore(restoredLore);
  }

  current.setDynamicProperty(MINIMAL_PROPERTY, minimal ? true : undefined);
  inventory.setItem(slot, current);
  return true;
}

/**
 * @param {import("@minecraft/server").Block} block
 * @param {FluidType} expectedFluid
 */
function consumeCauldronDose(block, expectedFluid) {
  const fluid = getFluidContainer(block);
  if (
    !fluid ||
    fluid.getFluidType() !== expectedFluid ||
    fluid.fillLevel < ARMOR_CAULDRON_COST
  ) {
    return false;
  }

  fluid.fillLevel = Math.max(0, fluid.fillLevel - ARMOR_CAULDRON_COST);
  if (fluid.fillLevel === 0) {
    invisibilityCauldrons.delete(cauldronKey(block));
    saveCauldronRegistry();
  }
  return true;
}

/**
 * @param {import("@minecraft/server").Player} player
 * @param {boolean} enabled
 */
function giveFeedback(player, enabled) {
  player.onScreenDisplay.setActionBar(
    enabled
      ? "§7Armor visibility: §aMinimal"
      : "§7Armor visibility: §fNormal",
  );
  player.playSound(enabled ? "cauldron.takepotion" : "cauldron.takewater");
}

world.afterEvents.playerInteractWithBlock.subscribe((event) => {
  const player = event.player;
  if (
    !isReadableRealPlayer(player) ||
    !event.isFirstEvent ||
    !isCauldron(event.block)
  ) {
    return;
  }

  const dimensionId = event.block.dimension.id;
  const location = { ...event.block.location };
  const usedPotion =
    event.beforeItemStack?.hasComponent("minecraft:potion") === true;
  const usedInvisibilityPotion = isInvisibilityPotion(event.beforeItemStack);
  system.run(() => {
    if (!isReadableRealPlayer(player)) return;

    const block = world.getDimension(dimensionId).getBlock(location);
    const fluid = block ? getFluidContainer(block) : undefined;
    if (!block) return;

    const key = cauldronKey(block);
    if (
      !fluid ||
      fluid.fillLevel <= 0 ||
      fluid.getFluidType() !== FluidType.Potion
    ) {
      if (invisibilityCauldrons.delete(key)) saveCauldronRegistry();
      return;
    }

    if (usedPotion) {
      if (usedInvisibilityPotion) {
        invisibilityCauldrons.add(key);
        player.onScreenDisplay.setActionBar("§7Invisibility cauldron: §aready");
      } else {
        invisibilityCauldrons.delete(key);
      }
      saveCauldronRegistry();
    }
  });
});

world.afterEvents.playerBreakBlock.subscribe((event) => {
  const { x, y, z } = event.block.location;
  const key = `${event.dimension.id}|${x},${y},${z}`;
  if (invisibilityCauldrons.delete(key)) saveCauldronRegistry();
});

world.beforeEvents.playerInteractWithBlock.subscribe((event) => {
  const player = event.player;
  if (
    !isReadableRealPlayer(player) ||
    !event.isFirstEvent ||
    !isCauldron(event.block) ||
    !event.itemStack
  ) {
    return;
  }
  if (!SUPPORTED_ARMOR.has(event.itemStack.typeId)) return;

  const currentlyMinimal =
    event.itemStack.getDynamicProperty(MINIMAL_PROPERTY) === true;
  const key = cauldronKey(event.block);
  const enabling = invisibilityCauldrons.has(key) && !currentlyMinimal;
  const disabling = currentlyMinimal;
  if (!enabling && !disabling) return;

  event.cancel = true;
  const typeId = event.itemStack.typeId;
  const dimensionId = event.block.dimension.id;
  const location = { ...event.block.location };

  system.run(() => {
    if (!isReadableRealPlayer(player)) return;

    const block = world.getDimension(dimensionId).getBlock(location);
    if (!block) return;

    const desiredState = enabling;
    const expectedFluid = enabling ? FluidType.Potion : FluidType.Water;
    const currentFluid = getFluidContainer(block);
    if (
      !currentFluid ||
      currentFluid.fillLevel < ARMOR_CAULDRON_COST ||
      currentFluid.getFluidType() !== expectedFluid
    ) {
      if (enabling) {
        invisibilityCauldrons.delete(key);
        saveCauldronRegistry();
      }
      return;
    }
    if (!setHeldMinimalState(player, typeId, desiredState)) return;

    if (player.getGameMode() !== GameMode.Creative) {
      consumeCauldronDose(block, expectedFluid);
    }
    giveFeedback(player, desiredState);
  });
});

world.afterEvents.playerSpawn.subscribe((event) => {
  const player = event.player;
  if (!player) return;

  // BedrockUnplugged applies its ghost tag after spawnSimulatedPlayer returns.
  system.run(() => syncPlayerArmorState(player));
});

world.afterEvents.dataDrivenEntityTrigger.subscribe(
  (event) => syncPlayerArmorState(event.entity),
  {
    entityTypes: ["minecraft:player"],
    eventTypes: ["sma:equipment_changed"],
  },
);

