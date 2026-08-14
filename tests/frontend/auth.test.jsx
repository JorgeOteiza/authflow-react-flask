import React from "react";
import { fireEvent, render, screen, waitFor } from "@testing-library/react";
import { MemoryRouter } from "react-router-dom";
import { describe, expect, it, vi } from "vitest";

import Signup from "../../src/front/js/component/Signup.jsx";
import LogIn from "../../src/front/js/component/LogIn.jsx";
import { VerifyEmail } from "../../src/front/js/pages/AuthFlows.jsx";
import { Context } from "../../src/front/js/store/context.js";

const renderWithContext = (component, actions, initialEntries = ["/"]) => render(
  <Context.Provider value={{ store: { user: null, sessionReady: true }, actions }}>
    <MemoryRouter initialEntries={initialEntries}>{component}</MemoryRouter>
  </Context.Provider>
);

describe("authentication forms", () => {
  it("prevents signup when password confirmation differs", async () => {
    const signup = vi.fn();
    renderWithContext(<Signup />, { signup });
    fireEvent.change(screen.getByLabelText("Correo electrónico"), { target: { value: "person@example.com" } });
    fireEvent.change(screen.getByLabelText("Contraseña"), { target: { value: "Secure1234" } });
    fireEvent.change(screen.getByLabelText("Confirma la contraseña"), { target: { value: "Different1234" } });
    fireEvent.click(screen.getByRole("button", { name: /crear cuenta/i }));
    expect(await screen.findByRole("alert")).toHaveTextContent("no coinciden");
    expect(signup).not.toHaveBeenCalled();
  });

  it("submits normalized login fields through the auth action", async () => {
    const login = vi.fn().mockResolvedValue({ ok: false, message: "Credenciales inválidas" });
    renderWithContext(<LogIn />, { login });
    fireEvent.change(screen.getByLabelText("Correo electrónico"), { target: { value: "person@example.com" } });
    fireEvent.change(screen.getByLabelText("Contraseña"), { target: { value: "Secure1234" } });
    fireEvent.click(screen.getByRole("button", { name: /iniciar sesión/i }));
    await waitFor(() => expect(login).toHaveBeenCalledWith("person@example.com", "Secure1234"));
    expect(screen.getByRole("alert")).toHaveTextContent("Credenciales inválidas");
  });

  it("preserves a verified email when returning to login", () => {
    renderWithContext(<LogIn />, { login: vi.fn() }, [{
      pathname: "/login",
      state: { email: "verified@example.com", verified: true }
    }]);

    expect(screen.getByLabelText("Correo electrónico")).toHaveValue("verified@example.com");
    expect(screen.getByRole("status")).toHaveTextContent("Correo verificado");
    expect(screen.getByRole("status")).toHaveTextContent("Vuelve a introducir tu contraseña");
  });

  it("keeps the verification tab on a distinct success screen", async () => {
    const verifyEmail = vi.fn().mockResolvedValue({
      ok: true,
      data: { user: { email: "verified@example.com" } }
    });
    renderWithContext(<VerifyEmail />, { verifyEmail }, ["/verify-email?token=valid-token"]);

    expect(await screen.findByRole("heading", { name: "Correo confirmado" })).toBeVisible();
    expect(screen.getByRole("status")).toHaveTextContent("Vuelve a la pestaña anterior");
    expect(screen.getByText("verified@example.com")).toBeVisible();
  });
});
