/**
 * STORY-187: Lock Radix Collapsible a11y — aria-expanded / data-state on toggle; focus ring classes on trigger.
 */
import { createElement } from "react";
import { act } from "react";
import { createRoot, type Root } from "react-dom/client";
import { afterEach, beforeAll, describe, expect, it } from "vitest";
import ChatWorkspaceTools from "./ChatWorkspaceTools";

beforeAll(() => {
  globalThis.IS_REACT_ACT_ENVIRONMENT = true;
  globalThis.ResizeObserver = class {
    observe() {}
    unobserve() {}
    disconnect() {}
  } as unknown as typeof ResizeObserver;
});

describe("ChatWorkspaceTools collapsible a11y", () => {
  let container: HTMLDivElement | null = null;
  let root: Root | null = null;

  afterEach(() => {
    act(() => {
      root?.unmount();
    });
    root = null;
    container?.remove();
    container = null;
  });

  it("CollapsibleTrigger toggles aria-expanded and root data-state", async () => {
    container = document.createElement("div");
    document.body.appendChild(container);
    root = createRoot(container);
    await act(async () => {
      root!.render(
        createElement(ChatWorkspaceTools, {
          onOpenSettingsSection: () => {},
          searchServerSnapshot: {
            provider: 'unconfigured',
            hybridEnabled: false,
            confidenceThreshold: 0.85,
          },
        }),
      );
    });

    const shell = container.querySelector('[data-testid="chat-workspace-tools"]');
    const trigger = container.querySelector('[data-slot="collapsible-trigger"]') as HTMLElement | null;

    expect(shell).not.toBeNull();
    expect(trigger).not.toBeNull();
    expect(shell?.getAttribute("data-state")).toBe("closed");
    expect(trigger?.getAttribute("aria-expanded")).toBe("false");

    await act(async () => {
      trigger!.dispatchEvent(new MouseEvent("click", { bubbles: true }));
    });
    expect(shell?.getAttribute("data-state")).toBe("open");
    expect(trigger?.getAttribute("aria-expanded")).toBe("true");

    await act(async () => {
      trigger!.dispatchEvent(new MouseEvent("click", { bubbles: true }));
    });
    expect(shell?.getAttribute("data-state")).toBe("closed");
    expect(trigger?.getAttribute("aria-expanded")).toBe("false");
  });

  it("trigger keeps focus-visible ring utilities for keyboard users (dark strip)", async () => {
    container = document.createElement("div");
    document.body.appendChild(container);
    root = createRoot(container);
    await act(async () => {
      root!.render(
        createElement(ChatWorkspaceTools, {
          onOpenSettingsSection: () => {},
          searchServerSnapshot: {
            provider: 'unconfigured',
            hybridEnabled: false,
            confidenceThreshold: 0.85,
          },
        }),
      );
    });
    const trigger = container.querySelector('[data-slot="collapsible-trigger"]') as HTMLElement | null;
    expect(trigger?.className).toMatch(/focus-visible:ring/);
    expect(trigger?.className).toMatch(/focus-visible:ring-offset-/);
  });
});
