import { fireEvent, render, screen, waitFor } from "@testing-library/react";
import { userEvent } from "@testing-library/user-event";

import { IonApp } from "@ionic/react";

import URLInput from "./URLInput";

describe("URLInput Component", () => {
    const renderComponent = (props = {}) => {
        const defaultProps = {
            label: "Test URL",
            ...props,
        };

        return render(
            <IonApp>
                <URLInput {...defaultProps} />
            </IonApp>,
        );
    };

    it("renders with default props", () => {
        renderComponent();
        const input = screen.getByTestId("url-input");

        expect(input).toBeInTheDocument();
        expect(input).toHaveAttribute("placeholder", "https://example.com");
        expect(input).toHaveAttribute("label", "Test URL");
    });

    it("displays error for invalid URL format", async () => {
        const user = userEvent.setup();

        renderComponent();
        const input = screen.getByTestId("url-input");
        let nativeInput: HTMLInputElement | null = null;
        await waitFor(() => {
            nativeInput = input.querySelector("input");
            expect(nativeInput).not.toBeNull();
        });

        await user.type(nativeInput!, "not-a-url");

        // Trigger blur to validate
        fireEvent.blur(input);

        expect(input).not.toHaveClass("ion-valid");
        expect(input).toHaveClass("ion-invalid");
    });

    it("accepts valid URL format", async () => {
        const user = userEvent.setup();

        renderComponent();
        const input = screen.getByTestId("url-input");
        let nativeInput: HTMLInputElement | null = null;
        await waitFor(() => {
            nativeInput = input.querySelector("input");
            expect(nativeInput).not.toBeNull();
        });

        await user.type(nativeInput!, "https://example.com");

        // Trigger blur to validate
        fireEvent.blur(input);

        expect(input).toHaveClass("ion-valid");
        expect(input).not.toHaveClass("ion-invalid");
    });

    it("applies custom class name", () => {
        renderComponent({ className: "custom-class" });
        const input = screen.getByTestId("url-input");
        expect(input).toHaveClass("custom-class");
    });

    it("calls onKeyDown when provided", async () => {
        const handleKeyDown = vi.fn();
        const user = userEvent.setup();

        renderComponent({ onKeyDown: handleKeyDown });
        const input = screen.getByTestId("url-input");
        let nativeInput: HTMLInputElement | null = null;
        await waitFor(() => {
            nativeInput = input.querySelector("input");
            expect(nativeInput).not.toBeNull();
        });

        await user.type(nativeInput!, "http://example.com");
        expect(handleKeyDown).toHaveBeenCalled();
    });

    it("respects disabled prop", async () => {
        renderComponent({ disabled: true });
        const input = screen.getByTestId("url-input");
        let nativeInput: HTMLInputElement | null = null;
        await waitFor(() => {
            nativeInput = input.querySelector("input");
            expect(nativeInput).not.toBeNull();
        });

        expect(nativeInput).toBeDisabled();
    });
});
