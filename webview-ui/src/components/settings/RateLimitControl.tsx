import { useAppTranslation } from "@/i18n/TranslationContext"
import { useEffect, useState } from "react"
import { useDebounce } from "react-use"

interface RateLimitControlProps {
	value: number | undefined | null
	onChange: (value: number | undefined | null) => void
}

export const RateLimitControl = ({ value, onChange }: RateLimitControlProps) => {
	const { t } = useAppTranslation()
	const [inputValue, setInputValue] = useState(value)
	useDebounce(() => onChange(inputValue), 50, [onChange, inputValue])

	// Sync internal state with prop changes when switching profiles
	useEffect(() => {
		setInputValue(value)
	}, [value])

	return (
		<div>
			<div className="flex flex-col gap-2">
				<span className="font-medium">{t("settings:modelInfo.rateLimit.label")}</span>
				<div className="flex items-center gap-2">
					<input
						type="range"
						min="0"
						max="60"
						step="1"
						value={inputValue ?? 0}
						onChange={(e) => setInputValue(parseInt(e.target.value))}
						className="h-2 focus:outline-0 w-4/5 accent-vscode-button-background"
					/>
					<span>{inputValue ?? 0}s</span>
				</div>
			</div>
			<p className="text-vscode-descriptionForeground text-sm mt-0">
				{t("settings:modelInfo.rateLimit.description")}
			</p>
		</div>
	)
}
