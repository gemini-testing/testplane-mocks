/* eslint @typescript-eslint/no-explicit-any: 0 */
export { writeMode } from "./writeMode";
export { readMode } from "./readMode";
import { RunMode } from "../types";

export async function useModes(
    {
        onPlay,
        onCreate,
        onSave,
    }: {
        onPlay?: () => Promise<any> | any;
        onCreate?: () => Promise<any> | any;
        onSave?: () => Promise<any> | any;
    },
    mode: RunMode,
): Promise<void> {
    const action = {
        [RunMode.Play]: onPlay,
        [RunMode.Create]: onCreate,
        [RunMode.Save]: onSave,
    }[mode];

    if (action) {
        await action();
    }
}
