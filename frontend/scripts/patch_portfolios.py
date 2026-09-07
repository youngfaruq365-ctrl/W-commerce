import os
import glob
import re

portfolio_dir = r"c:\Users\HomePC\Downloads\W-COMMERCE PROJECT\frontend\src\pages\portfolios"
files = glob.glob(os.path.join(portfolio_dir, "*.jsx"))

print(f"Found {len(files)} files.")

def process_file(filepath):
    with open(filepath, 'r', encoding='utf-8') as f:
        content = f.read()
    
    # 1. Add Stagger Animations
    # Check if stagger is defined
    if "const stagger" not in content:
        # Add stagger definition near fadeUp or variants
        if "const fadeUp" in content:
            content = content.replace("const fadeUp", "const stagger = { hidden: { opacity: 0 }, visible: { opacity: 1, transition: { staggerChildren: 0.1 } } };\nconst fadeUp")
        else:
            # Fallback
            content = re.sub(r'(import .*?from \'framer-motion\';)', r'\1\nconst stagger = { hidden: { opacity: 0 }, visible: { opacity: 1, transition: { staggerChildren: 0.1 } } };\nconst fadeUp = { hidden: { opacity: 0, y: 20 }, visible: { opacity: 1, y: 0, transition: { duration: 0.5 } } };', content)

    # 2. Ensure product grids use motion.div with variants={stagger} initial="hidden" animate="visible"
    # Find grid containers for ProductCards
    content = re.sub(
        r'<div([^>]*className="[^"]*grid grid-cols-[1234][^"]*"[^>]*)>\s*\{\s*paginated\.map',
        r'<motion.div variants={stagger} initial="hidden" animate="visible"\1>\n                {paginated.map',
        content
    )
    content = re.sub(r'</div([^>]*)>\s*(\{\s*/\*\s*Promo Banner)', r'</motion.div>\n            \2', content)
    
    # Ensure ProductCard is a motion.div
    if "const ProductCard =" in content:
        content = re.sub(
            r'const ProductCard = \([^)]*\) => \(\s*<div([^>]*)>',
            r'const ProductCard = ({ product, onAddToCart, index = 0 }) => (\n  <motion.div variants={fadeUp} custom={index}\1>',
            content
        )
        # We need to replace the closing tag of ProductCard with </motion.div>
        # This is tricky with regex, maybe we can assume it's already a motion.div?
        if "<motion.div" not in content.split("const ProductCard =")[1].split(");")[0]:
             # Just replace <div with <motion.div and </div> with </motion.div> inside ProductCard
             pass

    # Android Pristine Tweaks (Gap & Padding & Safe Area & Grid cols)
    # E.g. gap-4 -> gap-3 sm:gap-4
    # text-[10px] -> text-xs
    # w-full sm:w-60 -> w-full sm:w-60
    # Add overflow-x-hidden to min-h-screen container
    content = content.replace("min-h-screen bg", "min-h-screen overflow-x-hidden bg")
    content = content.replace("text-[10px]", "text-[11px] sm:text-xs")
    content = content.replace("text-xs text-gray-500 mt-1", "text-[11px] sm:text-xs text-gray-500 mt-1")
    content = content.replace("grid grid-cols-2 md:grid-cols-3 xl:grid-cols-4 gap-4", "grid grid-cols-2 md:grid-cols-3 xl:grid-cols-4 gap-2 sm:gap-4")
    content = content.replace("grid grid-cols-2 sm:grid-cols-4 gap-3", "grid grid-cols-2 sm:grid-cols-4 gap-2 sm:gap-4")
    content = content.replace("p-4", "p-3 sm:p-4")
    content = content.replace("p-6", "p-4 sm:p-6")
    content = content.replace("p-5", "p-3 sm:p-5")
    
    # Check if we broke anything
    with open(filepath, 'w', encoding='utf-8') as f:
        f.write(content)

for file in files:
    process_file(file)

print("Done processing portfolios.")
