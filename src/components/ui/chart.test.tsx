import { render } from "@testing-library/react"
import { ChartStyle, type ChartConfig } from "./chart"

describe("ChartStyle sanitization", () => {
  it("drops unsafe CSS values", () => {
    const config: ChartConfig = {
      safe: { color: "red" },
      unsafe: { color: "red; background:url('javascript:alert(1)')" },
    }

    const { container } = render(<ChartStyle id="test" config={config} />)
    const style = container.querySelector("style")
    expect(style).toBeTruthy()
    const html = style!.innerHTML

    expect(html).toContain("--color-safe: red;")
    expect(html).not.toContain("javascript")
    expect(html).not.toContain("--color-unsafe")
  })
})
