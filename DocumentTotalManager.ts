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
	show(totalText: string, view: MarkdownView): void {
		this.remove();

		if (!totalText) {
			return;
		}

		const contentEl = view.contentEl;
		if (!contentEl) {
			return;
		}

		this.documentTotalElement = contentEl.createDiv({
			cls: "food-tracker-total",
		});

		this.documentTotalElement.innerHTML = totalText;

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
	 * Updates the document total with new text
	 * More efficient than remove+show when element already exists
	 */
	update(totalText: string, view: MarkdownView): void {
		if (!totalText) {
			this.remove();
			return;
		}

		if (this.documentTotalElement) {
			this.documentTotalElement.innerHTML = totalText;
		} else {
			this.show(totalText, view);
		}
	}

	/**
	 * Checks if a document total element is currently displayed
	 */
	isVisible(): boolean {
		return this.documentTotalElement !== null;
	}
}
