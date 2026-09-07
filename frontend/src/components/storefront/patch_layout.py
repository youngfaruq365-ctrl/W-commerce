import os

file_path = "LayoutEngine.jsx"

with open(file_path, "r", encoding="utf-8") as f:
    content = f.read()

# 1. Add imports and wrappers at the top
import_statement = """import { celebrate } from '../visual/CelebrationController';
import { MagneticButton, RippleClick, HoverLiftCard, RevealContent } from '../visual/AnimationLibrary';

const ActionButton = ({ config, onClick, className = '', style = {}, title, children }) => {
  const styleType = config?.buttonStyle || 'standard';
  
  if (styleType === 'magnetic') {
    return <MagneticButton onClick={onClick} className={className} style={style} title={title}>{children}</MagneticButton>;
  }
  if (styleType === 'ripple') {
    return <RippleClick onClick={onClick} className={className} style={style} title={title}>{children}</RippleClick>;
  }
  return (
    <motion.button 
      whileTap={{ scale: 0.95 }}
      onClick={onClick}
      className={className}
      style={style}
      title={title}
    >
      {children}
    </motion.button>
  );
};

const ProductCardWrapper = ({ config, children, className = '', style = {} }) => {
  const hover = config?.hoverEffect || 'none';
  const borderGlow = config?.borderGlow || 'none';
  
  let combinedClass = className;
  if (borderGlow && borderGlow !== 'none') {
    combinedClass += ` anim-border-glow-${borderGlow}`;
  }
  
  if (hover === 'lift') {
    return <HoverLiftCard className={combinedClass} style={style}>{children}</HoverLiftCard>;
  }
  
  return <div className={combinedClass} style={style}>{children}</div>;
};

const SectionWrapper = ({ config, children, style={} }) => {
  if (config?.sectionReveal === 'reveal') {
    return <RevealContent style={style}>{children}</RevealContent>;
  }
  return <div style={style}>{children}</div>;
};
"""

content = content.replace("import { celebrate } from '../visual/CelebrationController';", import_statement)

# Update components signatures to accept animationConfig
components = [
    ("const PremiumCoverflow = ({ section, products, addToCart, wishlist, toggleWishlist", "const PremiumCoverflow = ({ section, products, addToCart, wishlist, toggleWishlist, animationConfig"),
    ("const LuxuryBento = ({ section, products, addToCart", "const LuxuryBento = ({ section, products, addToCart, animationConfig"),
    ("const EditorialMasonry = ({ section, products, addToCart", "const EditorialMasonry = ({ section, products, addToCart, animationConfig"),
    ("const InfinityCarousel = ({ section, products, addToCart", "const InfinityCarousel = ({ section, products, addToCart, animationConfig"),
    ("const CenterStage = ({ section, products, addToCart", "const CenterStage = ({ section, products, addToCart, animationConfig"),
    ("const GridArchetype = ({ section, products, params, addToCart, wishlist, toggleWishlist", "const GridArchetype = ({ section, products, params, addToCart, wishlist, toggleWishlist, animationConfig")
]
for old, new in components:
    content = content.replace(old, new)


# Update LayoutEngine export
content = content.replace(
    "export default function LayoutEngine({ section, products, addToCart, wishlist, toggleWishlist }) {",
    "export default function LayoutEngine({ section, products, addToCart, wishlist, toggleWishlist, animationConfig = {} }) {"
)

# Update switch cases
switch_cases = [
    ("<PremiumCoverflow section={section} products={products} params={params} addToCart={addToCart} wishlist={wishlist} toggleWishlist={toggleWishlist} />", 
     "<PremiumCoverflow section={section} products={products} params={params} addToCart={addToCart} wishlist={wishlist} toggleWishlist={toggleWishlist} animationConfig={animationConfig} />"),
    ("<LuxuryBento section={section} products={products} params={params} addToCart={addToCart} />",
     "<LuxuryBento section={section} products={products} params={params} addToCart={addToCart} animationConfig={animationConfig} />"),
    ("<EditorialMasonry section={section} products={products} params={params} addToCart={addToCart} />",
     "<EditorialMasonry section={section} products={products} params={params} addToCart={addToCart} animationConfig={animationConfig} />"),
    ("<InfinityCarousel section={section} products={products} params={params} addToCart={addToCart} />",
     "<InfinityCarousel section={section} products={products} params={params} addToCart={addToCart} animationConfig={animationConfig} />"),
    ("<CenterStage section={section} products={products} params={params} addToCart={addToCart} />",
     "<CenterStage section={section} products={products} params={params} addToCart={addToCart} animationConfig={animationConfig} />"),
    ("<GridArchetype section={section} products={products} params={params} addToCart={addToCart} wishlist={wishlist} toggleWishlist={toggleWishlist} />",
     "<GridArchetype section={section} products={products} params={params} addToCart={addToCart} wishlist={wishlist} toggleWishlist={toggleWishlist} animationConfig={animationConfig} />")
]
for old, new in switch_cases:
    content = content.replace(old, new)


# Wrap root divs with SectionWrapper
# PremiumCoverflow
content = content.replace(
    "<div style={{ margin: '4rem 0', padding: '0 1rem' }}>",
    "<SectionWrapper config={animationConfig} style={{ margin: '4rem 0', padding: '0 1rem' }}>"
)
content = content.replace("    </div>\n  );\n};\n\n// -------------------------------------------------------------", "    </SectionWrapper>\n  );\n};\n\n// -------------------------------------------------------------")

# We can replace all `<div style={{ margin: '5rem 0' }}>` with SectionWrapper
content = content.replace(
    "<div style={{ margin: '5rem 0' }}>",
    "<SectionWrapper config={animationConfig} style={{ margin: '5rem 0' }}>"
)

# InfinityCarousel has a different one
content = content.replace(
    "<div style={{ margin: '5rem 0', overflow: 'hidden' }}>",
    "<SectionWrapper config={animationConfig} style={{ margin: '5rem 0', overflow: 'hidden' }}>"
)

content = content.replace(
    "    </div>\n  );\n};",
    "    </SectionWrapper>\n  );\n};"
)

# Now, buttons inside each section.
# PremiumCoverflow button
old_btn = '''                  <motion.button 
                    whileTap={{ scale: 0.8, rotate: -10 }}
                    onClick={(e) => triggerCartAnimation(e, product, addToCart)}
                    style={{ 
                      width: '40px', height: '40px', 
                      borderRadius: '50%', background: 'var(--accent-gold)', 
                      display: 'flex', alignItems: 'center', justifyContent: 'center', 
                      cursor: 'pointer', border: 'none' 
                    }}
                    title="Add to Cart"
                  >'''
new_btn = '''                  <ActionButton 
                    config={animationConfig}
                    onClick={(e) => triggerCartAnimation(e, product, addToCart)}
                    style={{ 
                      width: '40px', height: '40px', 
                      borderRadius: '50%', background: 'var(--accent-gold)', 
                      display: 'flex', alignItems: 'center', justifyContent: 'center', 
                      cursor: 'pointer', border: 'none' 
                    }}
                    title="Add to Cart"
                  >'''
content = content.replace(old_btn, new_btn)
content = content.replace("</motion.button>\n                </div>\n              </div>\n            </div>", "</ActionButton>\n                </div>\n              </div>\n            </div>")

# LuxuryBento main button
old_bento_main_btn = '''<button onClick={(e) => triggerCartAnimation(e, mainProduct, addToCart)} className="btn btn-primary" style={{ padding: '1rem 2.5rem', fontSize: '1.1rem', borderRadius: '30px' }}>
                  Add to Cart
                </button>'''
new_bento_main_btn = '''<ActionButton config={animationConfig} onClick={(e) => triggerCartAnimation(e, mainProduct, addToCart)} className="btn btn-primary" style={{ padding: '1rem 2.5rem', fontSize: '1.1rem', borderRadius: '30px' }}>
                  Add to Cart
                </ActionButton>'''
content = content.replace(old_bento_main_btn, new_bento_main_btn)

# LuxuryBento side button
old_bento_side_btn = '''<button onClick={(e) => triggerCartAnimation(e, product, addToCart)} style={{ background: 'none', border: 'none', color: 'var(--text-primary)', cursor: 'pointer' }}><ShoppingCart size={18} /></button>'''
new_bento_side_btn = '''<ActionButton config={animationConfig} onClick={(e) => triggerCartAnimation(e, product, addToCart)} style={{ background: 'none', border: 'none', color: 'var(--text-primary)', cursor: 'pointer' }}><ShoppingCart size={18} /></ActionButton>'''
content = content.replace(old_bento_side_btn, new_bento_side_btn)

# EditorialMasonry button
old_editorial_btn = '''<button 
                  onClick={(e) => triggerCartAnimation(e, product, addToCart)}
                  style={{ background: 'var(--accent-gold)', color: '#000', border: 'none', borderRadius: '50%', width: '36px', height: '36px', display: 'flex', alignItems: 'center', justifyContent: 'center', cursor: 'pointer' }}
                >
                  <ShoppingCart size={16} />
                </button>'''
new_editorial_btn = '''<ActionButton 
                  config={animationConfig}
                  onClick={(e) => triggerCartAnimation(e, product, addToCart)}
                  style={{ background: 'var(--accent-gold)', color: '#000', border: 'none', borderRadius: '50%', width: '36px', height: '36px', display: 'flex', alignItems: 'center', justifyContent: 'center', cursor: 'pointer' }}
                >
                  <ShoppingCart size={16} />
                </ActionButton>'''
content = content.replace(old_editorial_btn, new_editorial_btn)

# InfinityCarousel button
old_infinity_btn = '''<button onClick={(e) => triggerCartAnimation(e, product, addToCart)} style={{ background: 'none', border: 'none', color: 'var(--text-primary)', cursor: 'pointer' }}><ShoppingCart size={18} /></button>'''
new_infinity_btn = '''<ActionButton config={animationConfig} onClick={(e) => triggerCartAnimation(e, product, addToCart)} style={{ background: 'none', border: 'none', color: 'var(--text-primary)', cursor: 'pointer' }}><ShoppingCart size={18} /></ActionButton>'''
content = content.replace(old_infinity_btn, new_infinity_btn)

# CenterStage button
old_center_btn = '''<button onClick={(e) => triggerCartAnimation(e, product, addToCart)} className="btn btn-primary" style={{ padding: '1rem 2rem', fontSize: '1.1rem', borderRadius: '30px', flex: 1 }}>
                Add to Cart
              </button>'''
new_center_btn = '''<ActionButton config={animationConfig} onClick={(e) => triggerCartAnimation(e, product, addToCart)} className="btn btn-primary" style={{ padding: '1rem 2rem', fontSize: '1.1rem', borderRadius: '30px', flex: 1 }}>
                Add to Cart
              </ActionButton>'''
content = content.replace(old_center_btn, new_center_btn)

# GridArchetype button
old_grid_btn = '''<button onClick={(e) => triggerCartAnimation(e, product, addToCart)} style={{ background: 'none', border: 'none', color: 'var(--text-primary)', cursor: 'pointer' }}><ShoppingCart size={18} /></button>'''
new_grid_btn = '''<ActionButton config={animationConfig} onClick={(e) => triggerCartAnimation(e, product, addToCart)} style={{ background: 'none', border: 'none', color: 'var(--text-primary)', cursor: 'pointer' }}><ShoppingCart size={18} /></ActionButton>'''
content = content.replace(old_grid_btn, new_grid_btn)


# Replace Product Wrappers

# 1. PremiumCoverflow - no wrapper mentioned for coverflow slide, but I can add it to the inner wrapper? The prompt says "products". I will wrap `.coverflow-slide-inner`.
content = content.replace(
    '<div className="coverflow-slide-inner">',
    '<ProductCardWrapper config={animationConfig} className="coverflow-slide-inner" style={{ height: "100%", width: "100%" }}>'
)
content = content.replace("                </div>\n              </div>\n            </div>\n          </SwiperSlide>", "                </ActionButton>\n                </div>\n              </ProductCardWrapper>\n            </div>\n          </SwiperSlide>")
# wait! Earlier I replaced "</motion.button>" with "</ActionButton>". The previous line above has motion.button.
# Let's be careful with replacing closing tags.

# 2. LuxuryBento Side Products
old_bento_side = '<div key={product.id} className="card" style={{ padding: 0, overflow: \'hidden\', display: \'flex\', flexDirection: \'column\', height: \'400px\', borderRadius: \'20px\' }}>'
new_bento_side = '<ProductCardWrapper config={animationConfig} key={product.id} className="card" style={{ padding: 0, overflow: \'hidden\', display: \'flex\', flexDirection: \'column\', height: \'400px\', borderRadius: \'20px\' }}>'
content = content.replace(old_bento_side, new_bento_side)
# Need to replace the matching closing </div> in LuxuryBento.
content = content.replace(
    "              </div>\n            </div>\n          </div>\n        ))}",
    "              </div>\n            </div>\n          </ProductCardWrapper>\n        ))}"
)

# 3. EditorialMasonry product
old_masonry = '<div key={product.id} style={{ breakInside: \'avoid\', marginBottom: \'1.5rem\', position: \'relative\', borderRadius: \'16px\', overflow: \'hidden\', height }}>'
new_masonry = '<ProductCardWrapper config={animationConfig} key={product.id} style={{ breakInside: \'avoid\', marginBottom: \'1.5rem\', position: \'relative\', borderRadius: \'16px\', overflow: \'hidden\', height }}>'
content = content.replace(old_masonry, new_masonry)
content = content.replace(
    "                </ActionButton>\n              </div>\n            </div>",
    "                </ActionButton>\n              </div>\n            </ProductCardWrapper>"
)

# 4. InfinityCarousel product
old_infinity = '<div style={{ borderRadius: \'20px\', overflow: \'hidden\', background: \'var(--bg-card)\', padding: \'1rem\' }}>'
new_infinity = '<ProductCardWrapper config={animationConfig} style={{ borderRadius: \'20px\', overflow: \'hidden\', background: \'var(--bg-card)\', padding: \'1rem\', height: "100%" }}>'
content = content.replace(old_infinity, new_infinity)
content = content.replace(
    "              </div>\n            </div>\n          </SwiperSlide>",
    "              </div>\n            </ProductCardWrapper>\n          </SwiperSlide>"
)

# 5. GridArchetype product
old_grid = '<div key={product.id} className="card" style={{ padding: 0, overflow: \'hidden\', display: \'flex\', flexDirection: \'column\', borderRadius: `${roundness}px`, position: \'relative\' }}>'
new_grid = '<ProductCardWrapper config={animationConfig} key={product.id} className="card" style={{ padding: 0, overflow: \'hidden\', display: \'flex\', flexDirection: \'column\', borderRadius: `${roundness}px`, position: \'relative\' }}>'
content = content.replace(old_grid, new_grid)
content = content.replace(
    "            </div>\n          </div>\n          );\n        })}",
    "            </div>\n          </ProductCardWrapper>\n          );\n        })}"
)

with open(file_path, "w", encoding="utf-8") as f:
    f.write(content)
