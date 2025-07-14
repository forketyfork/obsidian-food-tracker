import { MarkdownView } from "obsidian";

/**
 * Manages the display of nutrition totals as in-document elements
 * Handles creation, update, and removal of document total elements
 */
export default class DocumentTotalManager {
	private documentTotalElement: HTMLElement | null = null;

	/**
	 * Shows the nutrition total as an in-document element
	 * Positioned at the bottom of the document content
	 */
	show(totalElement: HTMLElement | null, view: MarkdownView): void {
		this.remove();

		if (!totalElement) {
			return;
		}

		const contentEl = view.contentEl;
		if (!contentEl) {
			return;
		}

		this.documentTotalElement = contentEl.createDiv({
			cls: "food-tracker-total",
		});

		this.documentTotalElement.appendChild(totalElement);

		// Append at the end of contentEl so it appears at the bottom
		contentEl.appendChild(this.documentTotalElement);
	}

	/**
	 * Removes the current document total element if it exists
	 */
	remove(): void {
		if (this.documentTotalElement) {
			this.documentTotalElement.remove();
			this.documentTotalElement = null;
		}
	}

	/**
	 * Clears the document total element (alias for remove)
	 */
	clear(): void {
		this.remove();
	}

	/**
	 * Updates the document total with new element
	 * More efficient than remove+show when element already exists
	 */
	update(totalElement: HTMLElement | null, view: MarkdownView): void {
		if (!totalElement) {
			this.remove();
			return;
		}

		if (this.documentTotalElement) {
			this.documentTotalElement.empty();
			this.documentTotalElement.appendChild(totalElement);
		} else {
			this.show(totalElement, view);
		}
	}

	/**
	 * Checks if a document total element is currently displayed
	 */
	isVisible(): boolean {
		return this.documentTotalElement !== null;
	}
}
