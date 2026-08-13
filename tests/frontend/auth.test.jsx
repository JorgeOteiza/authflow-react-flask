import React from "react";
import { fireEvent, render, screen, waitFor } from "@testing-library/react";
import { MemoryRouter } from "react-router-dom";
import { describe, expect, it, vi } from "vitest";

import Signup from "../../src/front/js/component/Signup.jsx";
import LogIn from "../../src/front/js/component/LogIn.jsx";
import { Context } from "../../src/front/js/store/context.js";

const renderWithContext = (component, actions) => render(
  <Context.Provider value={{ store: { user: null, sessionReady: true }, actions }}>
    <MemoryRouter>{component}</MemoryRouter>
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
});
