import React from "react";
import { observer } from "mobx-react-lite";
import { setIcon } from "obsidian";
import { NutritionStore } from "./NutritionStore";
import { FOOD_TRACKER_ICON_NAME } from "./icon";

interface NutrientData {
	calories?: number;
	fats?: number;
	protein?: number;
	carbs?: number;
	fiber?: number;
	sugar?: number;
	sodium?: number;
}

interface NutritionTotalProps {
	store: NutritionStore;
}

const NutritionTotalReact: React.FC<NutritionTotalProps> = observer(({ store }) => {
	const formatConfig: { key: keyof NutrientData; emoji: string; name: string; unit: string; decimals: number }[] = [
		{ key: "calories", emoji: "🔥", name: "Calories", unit: "kcal", decimals: 0 },
		{ key: "fats", emoji: "🥑", name: "Fats", unit: "g", decimals: 1 },
		{ key: "protein", emoji: "🥩", name: "Protein", unit: "g", decimals: 1 },
		{ key: "carbs", emoji: "🍞", name: "Carbs", unit: "g", decimals: 1 },
		{ key: "fiber", emoji: "🌾", name: "Fiber", unit: "g", decimals: 1 },
		{ key: "sugar", emoji: "🍯", name: "Sugar", unit: "g", decimals: 1 },
		{ key: "sodium", emoji: "🧂", name: "Sodium", unit: "mg", decimals: 1 },
	];

	const iconRef = React.useRef<HTMLSpanElement>(null);

	React.useEffect(() => {
		if (iconRef.current) {
			setIcon(iconRef.current, FOOD_TRACKER_ICON_NAME);
		}
	}, []);

	if (store.isLoading) {
		return <div className="food-tracker-nutrition-bar">Loading...</div>;
	}

	if (store.error) {
		return <div className="food-tracker-nutrition-bar food-tracker-error">Error: {store.error}</div>;
	}

	if (!store.hasNutrients) {
		return null;
	}

	const nutrientElements = formatConfig
		.filter(config => {
			const value = store.totalNutrients[config.key];
			return value && value > 0;
		})
		.map((config, index) => {
			const value = store.totalNutrients[config.key]!;
			const formattedValue = config.decimals === 0 ? Math.round(value) : value.toFixed(config.decimals);
			const tooltipText = `${config.name}: ${formattedValue} ${config.unit}`;

			let progressProps = {};
			let finalTooltipText = tooltipText;

			if (store.goals?.[config.key] !== undefined) {
				const goal = store.goals[config.key] as number;
				const ratio = goal > 0 ? value / goal : 0;
				const percent = Math.min(100, Math.round(ratio * 100));
				const actualPercent = Math.round(ratio * 100);

				const colorClass =
					ratio >= 0.9 && ratio <= 1.1
						? "food-tracker-progress-green"
						: ratio > 1.1
							? "food-tracker-progress-red"
							: "food-tracker-progress-yellow";

				finalTooltipText = `${config.name}: ${formattedValue} ${config.unit} (${actualPercent}% of ${goal} ${config.unit} goal)`;
				progressProps = {
					className: `food-tracker-nutrient-item food-tracker-tooltip-host food-tracker-progress ${colorClass}`,
					style: { "--food-tracker-progress-percent": `${percent}%` },
				};
			} else {
				progressProps = {
					className: "food-tracker-nutrient-item food-tracker-tooltip-host",
				};
			}

			return (
				<React.Fragment key={config.key}>
					{index > 0 && <div className="food-tracker-separator" />}
					<span {...progressProps} data-tooltip={finalTooltipText}>
						{config.emoji}
					</span>
				</React.Fragment>
			);
		});

	return (
		<div className="food-tracker-nutrition-bar">
			<span
				ref={iconRef}
				className="food-tracker-icon food-tracker-tooltip-host"
				data-tooltip="Food Tracker"
				aria-label="Food Tracker"
			/>
			<div className="food-tracker-separator" />
			{nutrientElements}
		</div>
	);
});

export default NutritionTotalReact;
