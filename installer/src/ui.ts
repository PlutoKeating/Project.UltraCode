export interface Spinner {
  update(label: string): void;
  stop(): void;
}

const FRAMES = ["⠋", "⠙", "⠹", "⠸", "⠼", "⠴", "⠦", "⠧", "⠇", "⠏"];

export function createSpinner(label: string, stream: NodeJS.WriteStream = process.stderr): Spinner {
  const interactive = Boolean(stream.isTTY) && !process.env.NO_COLOR;
  let current = label;

  if (!interactive) {
    if (current) stream.write(`${current}\n`);
    return {
      update(next: string) {
        if (next && next !== current) {
          current = next;
          stream.write(`${current}\n`);
        }
      },
      stop() {},
    };
  }

  let index = 0;
  let stopped = false;
  const render = () => {
    if (stopped) return;
    const frame = FRAMES[index % FRAMES.length];
    index += 1;
    stream.write(`\r\x1b[2K${frame} ${current}`);
  };

  render();
  const timer = setInterval(render, 80);
  timer.unref?.();

  return {
    update(next: string) {
      current = next;
      render();
    },
    stop() {
      if (stopped) return;
      stopped = true;
      clearInterval(timer);
      stream.write("\r\x1b[2K");
    },
  };
}
