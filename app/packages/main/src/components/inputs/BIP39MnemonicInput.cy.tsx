import BIP39MnemonicInput from "./BIP39MnemonicInput";

describe("<BIP39MnemonicInput />", () => {
    const MNEMONIC_VALID = "vessel ladder alter error federal sibling chat ability sun glass valve picture".split(" ");
    const MNEMONIC_INVALID = "vessel ladder alter error federal sibling chat ability sun glass valve all".split(" ");

    it("renders the correct number of inputs and the confirm button", () => {
        cy.mount(<BIP39MnemonicInput numWords={12} maxSuggestions={5} onEntropy={() => {}} onError={() => {}} />);

        cy.get("input").should("have.length", 12);
        cy.contains("Confirm").should("be.visible");
    });

    it("displays the initial words when provided", () => {
        cy.mount(
            <BIP39MnemonicInput
                numWords={12}
                initialWords={MNEMONIC_VALID}
                maxSuggestions={5}
                onEntropy={() => {}}
                onError={() => {}}
            />,
        );

        cy.get("input").each(($el, index) => {
            cy.wrap($el).should("have.value", MNEMONIC_VALID[index]);
        });
    });

    it("handles disabled property", () => {
        cy.mount(
            <BIP39MnemonicInput numWords={12} maxSuggestions={5} onEntropy={() => {}} onError={() => {}} disabled />,
        );

        cy.get("input").should("be.disabled");
        cy.contains("Confirm").should("not.exist");
    });

    it("allows the user to input words", () => {
        cy.mount(<BIP39MnemonicInput numWords={12} maxSuggestions={5} onEntropy={() => {}} onError={() => {}} />);

        cy.get("input").each(($el, index) => {
            cy.wrap($el).type(MNEMONIC_VALID[index]);
        });

        cy.get("input").each(($el, index) => {
            cy.wrap($el).should("have.value", MNEMONIC_VALID[index]);
        });
    });

    it("calls onEntropy with the generated entropy for a valid mnemonic", () => {
        const onEntropy = cy.stub().as("onEntropy");
        cy.mount(
            <BIP39MnemonicInput
                numWords={12}
                maxSuggestions={5}
                onEntropy={onEntropy}
                onError={() => {}}
                initialWords={MNEMONIC_VALID}
            />,
        );

        cy.contains("Confirm").click();

        cy.get("@onEntropy").should("have.been.calledOnce");
    });

    it("calls onError when not all words are filled in", () => {
        const onError = cy.stub().as("onError");
        cy.mount(
            <BIP39MnemonicInput
                numWords={12}
                maxSuggestions={5}
                onEntropy={() => {}}
                onError={onError}
                initialWords={[...MNEMONIC_VALID.slice(0, 11), ""]} // Last word is empty
            />,
        );

        cy.contains("Confirm").click();

        cy.get("@onError").should("have.been.calledWithMatch", new Error("All words must be present"));
    });

    it("calls onError for a mnemonic with an invalid checksum", () => {
        const onErrorSpy = cy.stub().as("onErrorSpy");
        cy.mount(
            <BIP39MnemonicInput
                numWords={12}
                maxSuggestions={5}
                onEntropy={() => {}}
                onError={onErrorSpy}
                initialWords={MNEMONIC_INVALID}
            />,
        );

        cy.contains("Confirm").click();

        cy.get("@onErrorSpy").should("have.been.calledWithMatch", new Error("Invalid checksum for mnemonic"));
    });
});
