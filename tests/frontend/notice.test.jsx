import React from "react";
import { act, render, screen } from "@testing-library/react";
import { afterEach, describe, expect, it, vi } from "vitest";

import GlobalNotice from "../../src/front/js/component/GlobalNotice.jsx";
import { Context } from "../../src/front/js/store/context.js";


afterEach(() => vi.useRealTimers());

describe("global confirmation notice", () => {
  it("shows account deletion and dismisses it after five seconds", () => {
    vi.useFakeTimers();
    const clearNotice = vi.fn();
    render(
      <Context.Provider value={{
        store: {
          notice: {
            title: "Cuenta eliminada con éxito",
            message: "Esperamos volver a verte pronto."
          }
        },
        actions: { clearNotice }
      }}>
        <GlobalNotice />
      </Context.Provider>
    );

    expect(screen.getByRole("status")).toHaveTextContent("Cuenta eliminada con éxito");
    act(() => vi.advanceTimersByTime(4999));
    expect(clearNotice).not.toHaveBeenCalled();
    act(() => vi.advanceTimersByTime(1));
    expect(clearNotice).toHaveBeenCalledOnce();
  });
});
