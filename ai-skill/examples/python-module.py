"""======> Reference By Comment <======
 * ===> 01 - Type Definitions & Data Structures
 * ===> 02 - Helper Functions & Math Converters
 * ===> 03 - Core Content Optimizer Service
 * ===> 04 - Public Module Interface
"""

from typing import Dict, List, Optional, Any, Union
import re

# =====> Type Definitions & Data Structures <===== #

ConfigDict = Dict[str, Any]
OptimizationResult = Dict[str, Union[str, int, bool]]


# =====> Helper Functions & Math Converters <===== #

# ====> Sizing Token Resolver <==== #
def px_to_rem(pixels: Union[int, float], base: int = 16) -> str:
    """Convert pixel numbers to REM values with base 16."""
    # ===> Compute REM Value <=== #
    rem_value = round(float(pixels) / base, 4)
    # ===> Return REM String <=== #
    return f"{rem_value}rem"


# ====> Column Size Resolver (Symmetric with Frontend) <==== #
def col_size_handler(size: int) -> str:
    """Format grid column size suffix matching Phenix conventions."""
    # ===> Guard Clause: Auto Size <=== #
    if size == 0:
        return "-auto"
    # ===> Guard Clause: Full Width / Exceeded <=== #
    if size > 12:
        return ""
    # ===> Standard Grid Fraction <=== #
    return f"-{size}"


# ====> Text Direction Detector <==== #
def detect_text_direction(text: str) -> str:
    """Detect if string starts with RTL language characters (Arabic/Hebrew)."""
    # ===> Guard: Empty String <=== #
    if not text:
        return "ltr"

    # ===> RTL Character Regex Check <=== #
    rtl_pattern = re.compile(r"[\u0591-\u07FF\uFB1D-\uFDFD\uFE70-\uFEFC]")
    return "rtl" if rtl_pattern.search(text) else "ltr"


# =====> Core Content Optimizer Service <===== #

class ContentOptimizer:
    """
    Modular, zero-bloat optimizer designed to clean redundant HTML,
    strip bloat wrappers, and normalize typography and directional tokens.
    """

    def __init__(self, options: Optional[ConfigDict] = None):
        # ===> Define Options & Defaults <=== #
        self.options = options or {}
        self.strip_empty_wrappers = self.options.get("strip_empty_wrappers", True)
        self.normalize_whitespace = self.options.get("normalize_whitespace", True)
        self.enforce_bidirectional = self.options.get("enforce_bidirectional", True)

    # ====> Main Pipeline Execution <==== #
    def process(self, raw_html: str) -> OptimizationResult:
        # ===> Guard Clause: Empty Input <=== #
        if not raw_html or not raw_html.strip():
            return {"content": "", "cleaned": False, "nodes_removed": 0, "direction": "ltr"}

        # ===> Step 1: Detect Direction <=== #
        direction = "ltr"
        if self.enforce_bidirectional:
            direction = detect_text_direction(raw_html)

        # ===> Step 2: Strip Bloat Wrappers <=== #
        cleaned_html = raw_html
        removed_count = 0

        if self.strip_empty_wrappers:
            cleaned_html, removed_count = self._strip_redundant_wrappers(cleaned_html)

        # ===> Step 3: Whitespace & Attribute Normalization <=== #
        if self.normalize_whitespace:
            cleaned_html = self._normalize_spacing(cleaned_html)

        # ===> Return Processed Result <=== #
        return {
            "content": cleaned_html,
            "cleaned": removed_count > 0,
            "nodes_removed": removed_count,
            "direction": direction,
        }

    # ====> Internal Wrapper Stripper <==== #
    def _strip_redundant_wrappers(self, html: str) -> tuple[str, int]:
        # ===> Guard Clause <=== #
        if not html:
            return html, 0

        # ===> Strip Empty Span Wrappers <=== #
        span_pattern = re.compile(r"<span\s+class=[\"'](?:bloat-wrap|cf7-wrap)[\"']>(.*?)</span>", re.DOTALL)
        matches = len(span_pattern.findall(html))
        stripped = span_pattern.sub(r"\1", html)

        # ===> Strip Unnecessary Divs <=== #
        div_pattern = re.compile(r"<div\s+class=[\"'](?:empty-container)[\"']>\s*</div>")
        matches += len(div_pattern.findall(stripped))
        stripped = div_pattern.sub("", stripped)

        return stripped, matches

    # ====> Internal Spacing Normalizer <==== #
    def _normalize_spacing(self, html: str) -> str:
        # ===> Guard Clause <=== #
        if not html:
            return ""

        # ===> Collapse Consecutive Spaces and Newlines <=== #
        collapsed = re.sub(r"[ \t]+", " ", html)
        return re.sub(r"\n\s*\n", "\n", collapsed).strip()


# =====> Public Module Interface <===== #

def optimize_markup(html_string: str, options: Optional[ConfigDict] = None) -> OptimizationResult:
    """Convenience function to run the optimizer in one call."""
    # ===> Guard: Empty Input <=== #
    if not html_string:
        return {"content": "", "cleaned": False, "nodes_removed": 0, "direction": "ltr"}

    # ===> Instantiate and Execute <=== #
    optimizer = ContentOptimizer(options)
    return optimizer.process(html_string)
