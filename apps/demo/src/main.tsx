import {StrictMode} from "react"
import {createRoot} from "react-dom/client"
import "@streamcat/overlay-engine/styles.css"
import "../../web/app/tokens.css"
import "../../web/components/ui/button.css"
import "../../web/components/layout/site-header.css"
import "../../web/app/(site)/home.css"
import "./demo.css"
import {App} from "./App"
import {installApiMock} from "./mock/api"

installApiMock()

const root = document.getElementById("root")
if (!root) throw new Error("Demo root element missing")

createRoot(root).render(
    <StrictMode>
        <App />
    </StrictMode>
)
