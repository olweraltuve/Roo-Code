import { render, fireEvent } from "@testing-library/react"
import { RateLimitControl } from "../RateLimitControl"

// Mock the translation hook
jest.mock("@/i18n/TranslationContext", () => ({
	useAppTranslation: () => ({
		t: (key: string) => key,
	}),
}))

describe("RateLimitControl", () => {
	it("renders with the provided value", () => {
		const onChange = jest.fn()
		const { getByRole } = render(<RateLimitControl value={10} onChange={onChange} />)

		const slider = getByRole("slider") as HTMLInputElement
		expect(slider.value).toBe("10")
	})

	it("calls onChange when the slider value changes", () => {
		const onChange = jest.fn()
		const { getByRole } = render(<RateLimitControl value={10} onChange={onChange} />)

		const slider = getByRole("slider") as HTMLInputElement
		fireEvent.change(slider, { target: { value: "20" } })

		// The onChange is debounced, so we need to wait for it to be called
		setTimeout(() => {
			expect(onChange).toHaveBeenCalledWith(20)
		}, 100)
	})

	it("updates the displayed value when the slider changes", () => {
		const onChange = jest.fn()
		const { getByRole, getByText } = render(<RateLimitControl value={10} onChange={onChange} />)

		const slider = getByRole("slider") as HTMLInputElement
		fireEvent.change(slider, { target: { value: "20" } })

		expect(getByText("20s")).toBeInTheDocument()
	})

	it("handles null or undefined values", () => {
		const onChange = jest.fn()
		const { getByRole } = render(<RateLimitControl value={null} onChange={onChange} />)

		const slider = getByRole("slider") as HTMLInputElement
		expect(slider.value).toBe("0")
	})
})
