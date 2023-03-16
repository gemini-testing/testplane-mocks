import EventEmitter from "events";

interface PendingEvent {
    name: string;
    args?: any[]; //eslint-disable-line @typescript-eslint/no-explicit-any
}

class StreamMock extends EventEmitter {
    private pendingEvents: PendingEvent[] = [];

    //eslint-disable-next-line @typescript-eslint/no-explicit-any
    public on(event: string, listener: (...args: any[]) => void): this {
        super.on(event, listener);

        this.emitListening();

        return this;
    }

    public setPendingEvents(pendingEvents: PendingEvent[]): void {
        this.pendingEvents = pendingEvents;

        this.emitListening();
    }

    public pipe = jest.fn();
    public end = jest.fn();

    private emitListening(): void {
        while (this.pendingEvents?.length && this.hasHandler(this.pendingEvents[0].name)) {
            const { name, args = [] } = this.pendingEvents.shift()!;

            this.emit(name, ...args);
        }
    }

    private hasHandler(eventName: string): boolean {
        return Boolean(this.listeners(eventName).length);
    }
}

export default StreamMock;
