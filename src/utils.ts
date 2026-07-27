type WithCause = Error & { cause?: unknown };

// Guards the cause-chain traversal against cyclic or excessively long chains.
const MAX_CAUSE_DEPTH = 20;

/**
 * Hangs `causeError` at the very bottom of `rootError`'s `cause` chain.
 *
 * Used by the soft handling of mocks errors: a real test failure stays the top-level
 * error, while the mocks error (e.g. "Cache is empty") remains visible as the deepest
 * cause instead of replacing the real one.
 */
export function attachErrorAsDeepestCause(rootError: Error, causeError: Error): void {
    let current: WithCause = rootError;

    for (let depth = 0; depth < MAX_CAUSE_DEPTH; depth++) {
        // Already somewhere in the chain — don't attach twice (protects against cycles).
        if (current === causeError) {
            return;
        }

        if (!current.cause || typeof current.cause !== "object") {
            current.cause = causeError;

            return;
        }

        current = current.cause as WithCause;
    }
}
