import {Locator} from "@readium/shared";

export function approximateProgressLocator(positions: Locator[], percentage: number): Locator | null {
    if (!positions.length || !Number.isFinite(percentage) || percentage < 0 || percentage > 1) return null;
    const starts = positions.map((position, index) => ({
        position,
        start: position.locations.totalProgression ?? position.locations.progression ?? index / positions.length,
    }));
    const usable = starts.filter(item => Number.isFinite(item.start) && item.start >= 0 && item.start <= 1).sort((a, b) => a.start - b.start);
    const match = [...usable].reverse().find(item => item.start <= percentage) ?? usable[0];
    if (!match) return null;
    const index = usable.indexOf(match);
    const next = usable[index + 1]?.start ?? 1;
    const progression = next > match.start ? Math.min(1, Math.max(0, (percentage - match.start) / (next - match.start))) : 1;
    return match.position.copyWithLocations({progression, totalProgression: percentage});
}
