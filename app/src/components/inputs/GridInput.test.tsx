import { render, screen, waitFor } from "@testing-library/react";
import { userEvent } from "@testing-library/user-event";

import { IonApp } from "@ionic/react";

import GridInput from "./GridInput";

describe("GridInput Component", () => {
    function renderComponent(props = {}) {
        return render(
            <IonApp>
                <GridInput {...props} />
            </IonApp>,
        );
    }

    it("renders with default props", async () => {
        renderComponent();
        const gridInput = screen.getByTestId("grid-input");

        expect(gridInput).toBeInTheDocument();
        let ionInput: HTMLIonInputElement | null = null;
        await waitFor(() => {
            ionInput = gridInput.querySelector("ion-input");
            expect(ionInput).not.toBeNull();
        });

        // Check if we have 16 inputs
        const inputs = gridInput.querySelectorAll("ion-input");
        expect(inputs.length).toBe(16);
    });

    it("renders with value", async () => {
        const value: string[] = Array.from({ length: 16 });
        for (let i = 0; i < 16; i++) {
            value[i] = i.toString().padStart(4, "0");
        }

        renderComponent({ value: value.join("") });
        const gridInput = screen.getByTestId("grid-input");
        let ionInput: HTMLIonInputElement | null = null;
        await waitFor(() => {
            ionInput = gridInput.querySelector("ion-input");
            expect(ionInput).not.toBeNull();
        });

        // Check if all inputs are 1234
        const inputs = gridInput.querySelectorAll("ion-input");
        for (let i = 0; i < 16; i++) {
            const input = inputs[i];
            expect(input).toHaveValue(value[i]);
        }
    });

    describe("renders correct value when typed", async () => {
        const user = userEvent.setup();

        const testValues = ["1234", "ABCD", "00GG", "1G2H", "????"];
        for (const value of testValues) {
            const expectedValue = value.replace(/[^0-9a-f]/gi, "").toUpperCase();

            it(`'${value}' as '${expectedValue}'`, async () => {
                renderComponent();
                const gridInput = screen.getByTestId("grid-input");
                let nativeInput: HTMLInputElement | null = null;
                await waitFor(() => {
                    nativeInput = gridInput.querySelector("input");
                    expect(nativeInput).not.toBeNull();
                });

                await user.type(nativeInput!, value);
                expect(nativeInput).toHaveValue(expectedValue);
            });
        }
    });

    it("calls onChange when value changes", async () => {
        const onValueChange = vi.fn();
        const user = userEvent.setup();

        renderComponent({ onChange: onValueChange });
        const gridInput = screen.getByTestId("grid-input");
        let nativeInput: HTMLInputElement | null = null;
        await waitFor(() => {
            nativeInput = gridInput.querySelector("input");
            expect(nativeInput).not.toBeNull();
        });

        await user.type(nativeInput!, "1234");
        expect(onValueChange).toHaveBeenCalled();
    });

    it("respects disabled prop", async () => {
        renderComponent({ disabled: true });
        const gridInput = screen.getByTestId("grid-input");
        let ionInput: HTMLIonInputElement | null = null;
        await waitFor(() => {
            ionInput = gridInput.querySelector("ion-input");
            expect(ionInput).not.toBeNull();
        });

        // Check if all inputs are disabled
        const inputs = gridInput.querySelectorAll("ion-input");
        for (const input of inputs) {
            expect(input).toBeDisabled();
        }
    });
});
