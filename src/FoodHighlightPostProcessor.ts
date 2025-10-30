import { App, Component, MarkdownPostProcessorContext } from "obsidian";
import { SettingsService } from "./SettingsService";
import NutrientCache from "./NutrientCache";
import {
	extractMultilineHighlightRanges,
	extractInlineCalorieAnnotations,
	CalorieProvider,
	HighlightOptions,
	HighlightRange,
} from "./FoodHighlightCore";

export default class FoodHighlightPostProcessor extends Component {
	private app: App;
	private settingsService: SettingsService;
	private nutrientCache: NutrientCache;

	constructor(app: App, settingsService: SettingsService, nutrientCache: NutrientCache) {
		super();
		this.app = app;
		this.settingsService = settingsService;
		this.nutrientCache = nutrientCache;
	}

	process(el: HTMLElement, _ctx: MarkdownPostProcessorContext): void {
		const settings = this.settingsService.currentSettings;
		const options: HighlightOptions = {
			escapedFoodTag: this.settingsService.currentEscapedFoodTag,
			escapedWorkoutTag: this.settingsService.currentEscapedWorkoutTag,
			foodTag: settings.foodTag,
			workoutTag: settings.workoutTag,
		};

		const calorieProvider: CalorieProvider = {
			getCaloriesForFood: (fileName: string) => {
				const normalized = fileName.trim();
				if (!normalized) {
					return null;
				}

				const data = this.nutrientCache.getNutritionData(normalized);
				const calories = data?.calories;
				return typeof calories === "number" && isFinite(calories) ? calories : null;
			},
			getServingSize: (fileName: string) => {
				const normalized = fileName.trim();
				if (!normalized) {
					return null;
				}

				const data = this.nutrientCache.getNutritionData(normalized);
				const servingSize = data?.serving_size;
				return typeof servingSize === "number" && isFinite(servingSize) ? servingSize : null;
			},
		};

		const containers: HTMLElement[] = [];
		if (el.matches("p, li, div.HyperMD-list-line")) {
			containers.push(el);
		} else {
			const elements = el.querySelectorAll("p, li, div.HyperMD-list-line");
			elements.forEach(element => {
				if (element instanceof HTMLElement) {
					containers.push(element);
				}
			});
		}

		for (const container of containers) {
			const reconstructedText = this.reconstructMarkdownText(container);

			if (!reconstructedText || !this.containsRelevantTags(reconstructedText, options)) {
				continue;
			}

			const hintPositions: Array<{ position: number; hintText: string }> = [];
			if (settings.showCalorieHints) {
				const annotations = extractInlineCalorieAnnotations(reconstructedText, 0, options, calorieProvider);
				for (const annotation of annotations) {
					hintPositions.push({ position: annotation.position, hintText: annotation.text });
				}
			}

			this.highlightMatches(container, reconstructedText, options);

			container.querySelectorAll(".food-tracker-inline-calories").forEach(el => el.remove());
			for (const { position, hintText } of hintPositions) {
				const insertionPoint = this.findInsertionNodeAtPosition(container, position);
				if (insertionPoint) {
					const insertionElement = this.findInsertionPoint(insertionPoint, container);
					const span = document.createElement("span");
					span.className = "food-tracker-inline-calories";
					span.textContent = " " + hintText;

					if (insertionElement?.parentNode) {
						if (insertionElement.nextSibling) {
							insertionElement.parentNode.insertBefore(span, insertionElement.nextSibling);
						} else {
							insertionElement.parentNode.appendChild(span);
						}
					} else {
						container.appendChild(span);
					}
				}
			}
		}
	}

	private containsRelevantTags(text: string, options: HighlightOptions): boolean {
		const tags = [options.escapedFoodTag, options.escapedWorkoutTag].filter(tag => tag.length > 0);
		if (tags.length === 0) return false;

		const tagPattern = tags.join("|");
		const tagRegex = new RegExp(`#(${tagPattern})`, "i");
		return tagRegex.test(text);
	}

	private highlightMatches(container: HTMLElement, reconstructedText: string, options: HighlightOptions): void {
		container
			.querySelectorAll(".food-tracker-value, .food-tracker-nutrition-value, .food-tracker-negative-kcal")
			.forEach(el => {
				const textNode = document.createTextNode(el.textContent ?? "");
				el.replaceWith(textNode);
			});

		const ranges = extractMultilineHighlightRanges(reconstructedText, 0, options);

		const rangesSorted = [...ranges].sort((a, b) => b.start - a.start);

		for (const range of rangesSorted) {
			const className = this.getClassNameForType(range.type);
			this.wrapTextAtPosition(container, range.start, range.end, className);
		}
	}

	private reconstructMarkdownText(container: HTMLElement): string {
		let result = "";
		const walker = document.createTreeWalker(container, NodeFilter.SHOW_ALL);

		let node: Node | null;
		while ((node = walker.nextNode())) {
			if (node.nodeType === Node.TEXT_NODE) {
				result += node.textContent ?? "";
			} else if (node.nodeType === Node.ELEMENT_NODE && node instanceof HTMLElement) {
				if (node.classList.contains("food-tracker-inline-calories")) {
					this.skipNodeChildren(walker, node);
				} else if (node.classList.contains("internal-link")) {
					const linkText = node.textContent ?? "";
					const href = node.getAttribute("data-href") ?? linkText;
					result += `[[${href}]]`;
					this.skipNodeChildren(walker, node);
				} else if (node.classList.contains("tag")) {
					result += node.textContent ?? "";
					this.skipNodeChildren(walker, node);
				} else if (node.tagName === "BR") {
					result += "\n";
				}
			}
		}

		return result;
	}

	private skipNodeChildren(walker: TreeWalker, _node: Node): void {
		const depth = this.getNodeDepth(walker.currentNode, walker.root);
		let next: Node | null;
		while ((next = walker.nextNode())) {
			const nextDepth = this.getNodeDepth(next, walker.root);
			if (nextDepth <= depth) {
				walker.previousNode();
				break;
			}
		}
	}

	private getNodeDepth(node: Node, root: Node): number {
		let depth = 0;
		let current: Node | null = node;
		while (current && current !== root) {
			depth++;
			current = current.parentNode;
		}
		return depth;
	}

	private findInsertionNodeAtPosition(container: HTMLElement, position: number): Node | null {
		const walker = document.createTreeWalker(container, NodeFilter.SHOW_ALL);
		let currentPosition = 0;

		let node: Node | null;
		let targetNode: Node | null = null;

		while ((node = walker.nextNode())) {
			if (node.nodeType === Node.TEXT_NODE) {
				const textLength = (node.textContent ?? "").length;
				if (currentPosition + textLength >= position) {
					targetNode = node;
					break;
				}
				currentPosition += textLength;
			} else if (node.nodeType === Node.ELEMENT_NODE && node instanceof HTMLElement) {
				if (node.classList.contains("food-tracker-inline-calories")) {
					this.skipNodeChildren(walker, node);
				} else if (node.classList.contains("internal-link")) {
					const href = node.getAttribute("data-href") ?? node.textContent ?? "";
					const wikiLinkLength = `[[${href}]]`.length;
					if (currentPosition + wikiLinkLength >= position) {
						targetNode = node;
						break;
					}
					currentPosition += wikiLinkLength;
					this.skipNodeChildren(walker, node);
				} else if (node.classList.contains("tag")) {
					const tagLength = (node.textContent ?? "").length;
					if (currentPosition + tagLength >= position) {
						targetNode = node;
						break;
					}
					currentPosition += tagLength;
					this.skipNodeChildren(walker, node);
				} else if (node.tagName === "BR") {
					if (currentPosition + 1 >= position) {
						targetNode = node;
						break;
					}
					currentPosition += 1;
				}
			}
		}

		return targetNode ?? container.lastChild;
	}

	private findInsertionPoint(targetNode: Node | null, container: HTMLElement): Node | null {
		if (!targetNode) return null;

		let current: Node | null = targetNode;

		while (current && current !== container) {
			if (
				current instanceof HTMLElement &&
				(current.classList.contains("food-tracker-value") ||
					current.classList.contains("food-tracker-nutrition-value") ||
					current.classList.contains("food-tracker-negative-kcal"))
			) {
				return current;
			}
			current = current.parentNode;
		}

		return targetNode;
	}

	private getClassNameForType(type: HighlightRange["type"]): string {
		switch (type) {
			case "amount":
				return "food-tracker-value";
			case "nutrition":
				return "food-tracker-nutrition-value";
			case "negative-kcal":
				return "food-tracker-negative-kcal";
		}
	}

	private wrapTextAtPosition(container: HTMLElement, startPos: number, endPos: number, className: string): void {
		const walker = document.createTreeWalker(container, NodeFilter.SHOW_ALL);
		let currentPosition = 0;

		const nodesToWrap: Array<{ node: Text; startOffset: number; endOffset: number }> = [];

		let node: Node | null;
		while ((node = walker.nextNode())) {
			if (node.nodeType === Node.TEXT_NODE && node instanceof Text) {
				const textLength = (node.textContent ?? "").length;
				const nodeStart = currentPosition;
				const nodeEnd = currentPosition + textLength;

				if (nodeEnd > startPos && nodeStart < endPos) {
					const wrapStart = Math.max(0, startPos - nodeStart);
					const wrapEnd = Math.min(textLength, endPos - nodeStart);
					nodesToWrap.push({ node, startOffset: wrapStart, endOffset: wrapEnd });
				}

				currentPosition += textLength;

				if (currentPosition >= endPos) break;
			} else if (node.nodeType === Node.ELEMENT_NODE && node instanceof HTMLElement) {
				if (node.classList.contains("food-tracker-inline-calories")) {
					this.skipNodeChildren(walker, node);
				} else if (node.classList.contains("internal-link")) {
					const href = node.getAttribute("data-href") ?? node.textContent ?? "";
					const wikiLinkLength = `[[${href}]]`.length;
					currentPosition += wikiLinkLength;
					this.skipNodeChildren(walker, node);
					if (currentPosition >= endPos) break;
				} else if (node.classList.contains("tag")) {
					const tagLength = (node.textContent ?? "").length;
					currentPosition += tagLength;
					this.skipNodeChildren(walker, node);
					if (currentPosition >= endPos) break;
				} else if (node.tagName === "BR") {
					currentPosition += 1;
					if (currentPosition >= endPos) break;
				}
			}
		}

		if (nodesToWrap.length === 0) return;

		if (nodesToWrap.length === 1) {
			const { node: textNode, startOffset, endOffset } = nodesToWrap[0];
			const content = textNode.textContent ?? "";
			const before = content.substring(0, startOffset);
			const match = content.substring(startOffset, endOffset);
			const after = content.substring(endOffset);

			const span = document.createElement("span");
			span.className = className;
			span.textContent = match;

			const parent = textNode.parentElement;
			if (!parent) return;

			if (before) parent.insertBefore(document.createTextNode(before), textNode);
			parent.insertBefore(span, textNode);
			if (after) parent.insertBefore(document.createTextNode(after), textNode);
			parent.removeChild(textNode);
		} else {
			const span = document.createElement("span");
			span.className = className;

			for (let i = 0; i < nodesToWrap.length; i++) {
				const { node: textNode, startOffset, endOffset } = nodesToWrap[i];
				const content = textNode.textContent ?? "";

				if (i === 0) {
					const before = content.substring(0, startOffset);
					const match = content.substring(startOffset, endOffset);

					if (before) {
						textNode.parentElement?.insertBefore(document.createTextNode(before), textNode);
					}
					span.textContent = match;
					textNode.parentElement?.insertBefore(span, textNode);
					textNode.remove();
				} else if (i === nodesToWrap.length - 1) {
					const match = content.substring(startOffset, endOffset);
					const after = content.substring(endOffset);

					span.textContent += match;
					if (after) {
						textNode.parentElement?.insertBefore(document.createTextNode(after), textNode);
					}
					textNode.remove();
				} else {
					span.textContent += content;
					textNode.remove();
				}
			}
		}
	}
}
