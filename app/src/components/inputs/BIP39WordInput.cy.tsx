import BIP39WordInput, { DEBOUNCE_TIME, LOSS_FOCUS_CLEAR_DELAY } from "./BIP39WordInput";

describe("<BIP39WordInput />", () => {
    it("renders with a placeholder", () => {
        cy.mount(<BIP39WordInput maxSuggestions={5} onWordSelected={() => {}} placeholder="Enter a word" />);
        cy.get("ion-searchbar").should("have.attr", "placeholder", "Enter a word");
    });

    it("shows suggestions as the user types", () => {
        cy.mount(<BIP39WordInput maxSuggestions={5} onWordSelected={() => {}} />);
        cy.get("ion-searchbar").find("input").type("acc");
        cy.get("ion-list").should("be.visible");
        cy.get("ion-item").should("have.length", 4);
        cy.get("ion-item").first().should("contain.text", "access");
    });

    it("waits for the debounce time before showing suggestions", () => {
        cy.clock();
        cy.mount(<BIP39WordInput maxSuggestions={5} onWordSelected={() => {}} />);
        cy.get("ion-searchbar").find("input").type("p", { delay: 0 });
        cy.get("ion-list").should("not.exist");
        cy.tick(DEBOUNCE_TIME);
        cy.get("ion-list").should("be.visible");
    });

    it("limits the number of suggestions based on maxSuggestions prop", () => {
        cy.mount(<BIP39WordInput maxSuggestions={2} onWordSelected={() => {}} />);
        cy.get("ion-searchbar").find("input").type("p");
        cy.get("ion-list").should("be.visible");
        cy.get("ion-item").should("have.length", 2);
    });

    it("calls onWordSelected with the selected word when a suggestion is clicked", () => {
        const onWordSelected = cy.stub().as("onWordSelected");
        cy.mount(<BIP39WordInput maxSuggestions={5} onWordSelected={onWordSelected} />);
        cy.get("ion-searchbar").find("input").type("ban");
        cy.get("ion-item").contains("banana").click();
        cy.get("@onWordSelected").should("have.been.calledWith", "banana");
    });

    it("hides suggestions after a word is selected", () => {
        cy.mount(<BIP39WordInput maxSuggestions={5} onWordSelected={() => {}} />);
        cy.get("ion-searchbar").find("input").type("ban");
        cy.get("ion-item").contains("banana").click();
        cy.get("ion-list").should("not.exist");
    });

    it("clears suggestions and calls onWordSelected with null when input is cleared", () => {
        const onWordSelected = cy.stub().as("onWordSelected");
        cy.mount(<BIP39WordInput maxSuggestions={5} onWordSelected={onWordSelected} />);
        cy.get("ion-searchbar").find("input").type("gra");
        cy.get("ion-list").should("be.visible");
        cy.get("ion-searchbar").find("input").clear();
        cy.get("@onWordSelected").should("have.been.calledWith", null);
        cy.get("ion-list").should("not.exist");
    });

    it('shows "No Matches" when there are no suggestions', () => {
        cy.mount(<BIP39WordInput maxSuggestions={5} onWordSelected={() => {}} />);
        cy.get("ion-searchbar").find("input").type("xyz");
        cy.get("ion-list").should("be.visible");
        cy.get("ion-item").should("contain.text", "No Matches");
    });

    it("keeps the input value if a suggestion was selected", () => {
        cy.mount(<BIP39WordInput maxSuggestions={5} onWordSelected={() => {}} />);
        cy.get("ion-searchbar").find("input").type("ora");
        cy.get("ion-item").contains("orange").click();
        cy.get("ion-searchbar").should("have.value", "orange");
    });

    it("clears the input value if text is not a valid word", () => {
        cy.clock();
        const onWordSelected = cy.stub().as("onWordSelected");
        cy.mount(<BIP39WordInput maxSuggestions={5} onWordSelected={onWordSelected} />);
        cy.get("ion-searchbar").find("input").type("xyz");
        cy.tick(DEBOUNCE_TIME);
        cy.get("ion-searchbar").find("input").blur();
        cy.get("ion-searchbar").should("have.value", "");
        cy.get("@onWordSelected").should("have.been.calledWith", null);
    });

    it("keeps the input value if text is a valid word even if no suggestion was clicked", () => {
        cy.clock();
        const onWordSelected = cy.stub().as("onWordSelected");
        cy.mount(<BIP39WordInput maxSuggestions={3} onWordSelected={onWordSelected} />);
        cy.get("ion-searchbar").find("input").type("grape");
        cy.tick(DEBOUNCE_TIME);
        cy.get("ion-searchbar").find("input").blur();
        cy.tick(LOSS_FOCUS_CLEAR_DELAY);
        cy.get("ion-searchbar").should("have.value", "grape");
        cy.get("@onWordSelected").should("have.been.calledWith", "grape");
    });

    it("hides the suggestions list after a delay", () => {
        cy.clock();
        cy.mount(<BIP39WordInput maxSuggestions={5} onWordSelected={() => {}} />);
        cy.get("ion-searchbar").find("input").type("pin");
        cy.tick(DEBOUNCE_TIME);
        cy.get("ion-list").should("be.visible");
        cy.get("ion-searchbar").find("input").blur();
        cy.get("ion-list").should("be.visible");
        cy.tick(LOSS_FOCUS_CLEAR_DELAY);
        cy.get("ion-list").should("not.exist");
    });
});
