import { fireEvent, render, screen } from "@testing-library/react";
import { userEvent } from "@testing-library/user-event";

import URLInput from "./URLInput";

describe("URLInput Component", () => {
    const renderComponent = (props = {}) => {
        const defaultProps = {
            label: "Test URL",
            ...props,
        };

        return render(<URLInput {...defaultProps} />);
    };

    // it("renders with default props", () => {
    //     renderComponent();
    //     const input = screen.getByTestId("url-input");

    //     expect(input).toBeInTheDocument();
    //     expect(input).toHaveAttribute("placeholder", "https://example.com");
    //     expect(input).toHaveAttribute("label", "Test URL");
    // });

    // it("displays error for invalid URL format", async () => {
    //     const user = userEvent.setup();
    //     renderComponent();

    //     const input = screen.getByTestId("url-input");
    //     await user.type(input, "not-a-url");

    //     // Trigger blur to validate
    //     fireEvent.blur(input);

    //     expect(screen.getByText("Invalid URL")).toBeInTheDocument();
    // });

    it("accepts valid URL format", async () => {
        const user = userEvent.setup();
        renderComponent();

        const input = screen.getByTestId("url-input");
        console.log(input.children);
        await user.type(input, "https://example.com");

        // Trigger blur to validate
        fireEvent.blur(input);

        expect(screen.getByText("Invalid URL")).not.toBeInTheDocument();
    });

    // it("shows no error when empty", () => {
    //     renderComponent();
    //     const input = screen.getByTestId("url-input");

    //     // Should not show error when empty and not touched
    //     expect(input).not.toHaveClass("ion-invalid");
    //     expect(input).not.toHaveClass("ion-valid");

    //     // After blur, still no error
    //     fireEvent.blur(input);
    //     expect(input).not.toHaveClass("ion-invalid");
    // });

    // it("applies custom class name", () => {
    //     renderComponent({ className: "custom-class" });
    //     const input = screen.getByTestId("url-input");
    //     expect(input).toHaveClass("custom-class");
    // });

    it("calls onKeyDown when provided", async () => {
        const handleKeyDown = vi.fn((event) => {
            if (event.key === "Enter") {
                event.preventDefault();
            }
        });
        const user = userEvent.setup();

        renderComponent({ onKeyDown: handleKeyDown });
        const input = screen.getByTestId("url-input");

        await user.type(input, "http://example.com");
        expect(handleKeyDown).toHaveBeenCalled();
    });

    it("respects disabled prop", () => {
        renderComponent({ disabled: true });
        const input = screen.getByTestId("url-input");
        expect(input).toBeDisabled();
    });
});
