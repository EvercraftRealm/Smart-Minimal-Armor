$ErrorActionPreference = "Stop"

$projectRoot = Split-Path -Parent $PSScriptRoot
$behaviorPack = Join-Path $projectRoot "packs\Smart_Minimal_Armor_BP"
$resourcePack = Join-Path $projectRoot "packs\Smart_Minimal_Armor_RP"
$dist = Join-Path $projectRoot "dist"
$staging = Join-Path $dist "staging"

$behaviorManifest = Get-Content -LiteralPath (Join-Path $behaviorPack "manifest.json") -Raw | ConvertFrom-Json
$resourceManifest = Get-Content -LiteralPath (Join-Path $resourcePack "manifest.json") -Raw | ConvertFrom-Json
$packVersion = $behaviorManifest.header.version -join "."
$resourceVersion = $resourceManifest.header.version -join "."

if ($packVersion -ne $resourceVersion) {
    throw "Pack version mismatch: BP $packVersion, RP $resourceVersion."
}

$behaviorResourceDependency = $behaviorManifest.dependencies |
    Where-Object { $_.uuid -eq $resourceManifest.header.uuid } |
    Select-Object -First 1
$resourceBehaviorDependency = $resourceManifest.dependencies |
    Where-Object { $_.uuid -eq $behaviorManifest.header.uuid } |
    Select-Object -First 1

if (($behaviorResourceDependency.version -join ".") -ne $packVersion) {
    throw "Behavior pack resource dependency does not match version $packVersion."
}

if (($resourceBehaviorDependency.version -join ".") -ne $packVersion) {
    throw "Resource pack behavior dependency does not match version $packVersion."
}

foreach ($pack in @($behaviorPack, $resourcePack)) {
    Get-ChildItem -LiteralPath $pack -Recurse -File -Filter "*.json" | ForEach-Object {
        try {
            Get-Content -LiteralPath $_.FullName -Raw | ConvertFrom-Json | Out-Null
        }
        catch {
            throw "Invalid JSON: $($_.FullName): $($_.Exception.Message)"
        }
    }
}

$requiredFiles = @(
    (Join-Path $behaviorPack "manifest.json"),
    (Join-Path $behaviorPack "pack_icon.png"),
    (Join-Path $behaviorPack "entities\player.json"),
    (Join-Path $behaviorPack "scripts\main.js"),
    (Join-Path $resourcePack "manifest.json"),
    (Join-Path $resourcePack "pack_icon.png"),
    (Join-Path $resourcePack "models\entity\sma_minimal_armor.geo.json"),
    (Join-Path $resourcePack "models\entity\sma_minimal_helmet_world.geo.json"),
    (Join-Path $resourcePack "render_controllers\sma_armor.render_controllers.json")
)

foreach ($required in $requiredFiles) {
    if (-not (Test-Path -LiteralPath $required -PathType Leaf)) {
        throw "Missing required file: $required"
    }
}

$attachableCount = @(Get-ChildItem -LiteralPath (Join-Path $resourcePack "attachables") -File -Filter "*.json").Count
if ($attachableCount -ne 29) {
    throw "Expected 29 attachable definitions, found $attachableCount."
}

$privateTextureDirectory = Join-Path $resourcePack "textures\sma"
if (Test-Path -LiteralPath $privateTextureDirectory) {
    throw "Private source textures must not be included: $privateTextureDirectory"
}

if (Test-Path -LiteralPath $dist) {
    Remove-Item -LiteralPath $dist -Recurse -Force
}
New-Item -ItemType Directory -Path $staging -Force | Out-Null

$behaviorZip = Join-Path $dist "Smart Minimal Armor BP.zip"
$resourceZip = Join-Path $dist "Smart Minimal Armor RP.zip"
$behaviorMcpack = Join-Path $staging "Smart Minimal Armor BP.mcpack"
$resourceMcpack = Join-Path $staging "Smart Minimal Armor RP.mcpack"

Compress-Archive -Path (Join-Path $behaviorPack "*") -DestinationPath $behaviorZip -CompressionLevel Optimal
Compress-Archive -Path (Join-Path $resourcePack "*") -DestinationPath $resourceZip -CompressionLevel Optimal
Move-Item -LiteralPath $behaviorZip -Destination $behaviorMcpack
Move-Item -LiteralPath $resourceZip -Destination $resourceMcpack

$addonZip = Join-Path $dist "Smart Minimal Armor.zip"
$addonPath = Join-Path $dist "Smart Minimal Armor $packVersion.mcaddon"
Compress-Archive -Path (Join-Path $staging "*") -DestinationPath $addonZip -CompressionLevel Optimal
Move-Item -LiteralPath $addonZip -Destination $addonPath

Write-Output "Built $addonPath"

