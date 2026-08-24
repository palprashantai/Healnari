import base64
with open('d:/femcare/Healnari/public/brand/logo-icon-cropped.png', 'rb') as f:
    b64 = base64.b64encode(f.read()).decode('utf-8')
    
svg = f"""<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 572 577" role="img" aria-label="HealNari Icon">
  <image width="572" height="577" href="data:image/png;base64,{b64}" />
</svg>"""

with open('d:/femcare/Healnari/public/brand/logo-icon.svg', 'w') as f:
    f.write(svg)
    
logo = f"""<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 2000 600" role="img" aria-label="HealNari">
  <image width="572" height="577" href="data:image/png;base64,{b64}" />
  <text x="600" y="380" font-family="'Playfair Display', Georgia, serif" font-size="280" font-weight="800" letter-spacing="-0.02em" fill="#6B46C1">Heal</text>
  <text x="1200" y="380" font-family="'Playfair Display', Georgia, serif" font-size="280" font-weight="800" letter-spacing="-0.02em" fill="#E23E8C">Nari</text>
</svg>"""

with open('d:/femcare/Healnari/public/brand/logo.svg', 'w') as f:
    f.write(logo)
