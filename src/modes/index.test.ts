import { useModes } from ".";
import { RunMode } from "../types";

describe("modes", () => {
    const onPlay = jest.fn();
    const onSave = jest.fn();
    const onCreate = jest.fn();

    const useModes_ = (mode: RunMode): Promise<void> => useModes({ onPlay, onSave, onCreate }, mode);

    beforeEach(jest.clearAllMocks);

    it('should call "onPlay" only when mode is "play"', () => {
        useModes_(RunMode.Play);

        expect(onPlay).toBeCalled();
        expect(onSave).not.toBeCalled();
        expect(onCreate).not.toBeCalled();
    });

    it('should call "onSave" only when mode is "save"', () => {
        useModes_(RunMode.Save);

        expect(onPlay).not.toBeCalled();
        expect(onSave).toBeCalled();
        expect(onCreate).not.toBeCalled();
    });

    it('should call "onCreate" only when mode is "create"', () => {
        useModes_(RunMode.Create);

        expect(onPlay).not.toBeCalled();
        expect(onSave).not.toBeCalled();
        expect(onCreate).toBeCalled();
    });
});
