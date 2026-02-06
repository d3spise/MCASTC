import json
import os
from datetime import datetime

# Konfiguracja
POSTS_DIR_PL = "posts/pl"
POSTS_DIR_EN = "posts/en"
JSON_PATH_PL = "posts/pl/index.json"
JSON_PATH_EN = "posts/en/index.json"
DEFAULT_IMAGE = "img/banner_image.webp"
SITEMAP_PATH = "sitemap.xml"

def input_or_default(prompt, default):
    val = input(f"{prompt} [{default}]: ").strip()
    return val if val else default

def load_json(path):
    if not os.path.exists(path):
        return []
    try:
        with open(path, 'r', encoding='utf-8') as f:
            content = f.read().strip()
            if not content:
                return []
            return json.loads(content)
    except json.JSONDecodeError:
        print(f"⚠️  Błąd: Plik {path} zawiera niepoprawny JSON. Rozpoczynam z pustą listą.")
        return []

def save_json(path, data):
    with open(path, 'w', encoding='utf-8') as f:
        json.dump(data, f, indent=4, ensure_ascii=False)

def create_markdown_file(path, title, date):
    if os.path.exists(path):
        print(f"⚠️  Plik {path} już istnieje, pomijam tworzenie.")
        return
    
    content = f"""
Wprowadź treść artykułu tutaj...

Pamiętaj: Tytuł, data i zdjęcie są już wyświetlane automatycznie na górze strony (pobierane z bazy danych).
Tutaj wpisz tylko treść właściwą.

Możesz używać:
- **Pogrubienia**
- [Linków](#)
- YouTube: `<div class="aspect-video"><iframe... ></iframe></div>`
"""
    with open(path, 'w', encoding='utf-8') as f:
        f.write(content)
    print(f"✅ Utworzono plik: {path}")

def update_sitemap(post_id, date_str):
    if not os.path.exists(SITEMAP_PATH):
        print("⚠️  Nie znaleziono pliku sitemap.xml. Pomijam aktualizację mapy strony.")
        return

    with open(SITEMAP_PATH, 'r', encoding='utf-8') as f:
        content = f.read()

    # Sprawdź czy wpis już istnieje
    if f"article.html?id={post_id}" in content:
        print("⚠️  Wpis dla tego artykułu już istnieje w sitemap.xml.")
        return

    # Przygotuj nowy wpis XML
    new_entry = f"""
  <url>
    <loc>https://www.neuroimmunehub.com/article.html?id={post_id}</loc>
    <xhtml:link rel="alternate" hreflang="pl" href="https://www.neuroimmunehub.com/article.html?id={post_id}" />
    <xhtml:link rel="alternate" hreflang="en" href="https://www.neuroimmunehub.com/en/article.html?id={post_id}" />
    <xhtml:link rel="alternate" hreflang="x-default" href="https://www.neuroimmunehub.com/en/article.html?id={post_id}" />
    <lastmod>{date_str}</lastmod>
    <changefreq>monthly</changefreq>
    <priority>0.80</priority>
  </url>
  <url>
    <loc>https://www.neuroimmunehub.com/en/article.html?id={post_id}</loc>
    <xhtml:link rel="alternate" hreflang="pl" href="https://www.neuroimmunehub.com/article.html?id={post_id}" />
    <xhtml:link rel="alternate" hreflang="en" href="https://www.neuroimmunehub.com/en/article.html?id={post_id}" />
    <xhtml:link rel="alternate" hreflang="x-default" href="https://www.neuroimmunehub.com/en/article.html?id={post_id}" />
    <lastmod>{date_str}</lastmod>
    <changefreq>monthly</changefreq>
    <priority>0.80</priority>
  </url>"""

    # Wstaw przed zamknięciem tagu urlset
    if "</urlset>" in content:
        new_content = content.replace("</urlset>", f"{new_entry}\n</urlset>")
        with open(SITEMAP_PATH, 'w', encoding='utf-8') as f:
            f.write(new_content)
        print("✅ Zaktualizowano sitemap.xml")
    else:
        print("⚠️  Nie znaleziono tagu zamykającego </urlset> w sitemap.xml")

def main():
    print("--- GENERATOR NOWEGO ARTYKUŁU ---")
    
    # 1. Podstawowe dane
    post_id = input("Podaj ID artykułu (bez spacji, np. nowa-terapia): ").strip()
    if not post_id:
        print("Błąd: ID jest wymagane.")
        return

    today = datetime.now().strftime("%Y-%m-%d")
    date_str = input_or_default("Data publikacji", today)
    
    print("\n--- Wersja POLSKA ---")
    title_pl = input("Tytuł (PL): ").strip()
    desc_pl = input("Krótki opis (PL): ").strip()
    tags_pl_input = input("Tagi (PL) oddzielone przecinkiem: ").strip()
    tags_pl = [t.strip() for t in tags_pl_input.split(',')] if tags_pl_input else ["Ogólne"]

    print("\n--- Wersja ANGIELSKA ---")
    title_en = input("Tytuł (EN): ").strip() or title_pl
    desc_en = input("Krótki opis (EN): ").strip() or desc_pl
    tags_en_input = input("Tagi (EN) oddzielone przecinkiem: ").strip()
    tags_en = [t.strip() for t in tags_en_input.split(',')] if tags_en_input else ["General"]

    print("\n--- Multimedia ---")
    image_path = input_or_default("Ścieżka do zdjęcia (banner)", DEFAULT_IMAGE)

    # 2. Aktualizacja JSON
    new_entry_pl = {
        "id": post_id,
        "title": title_pl,
        "date": date_str,
        "desc": desc_pl,
        "image": image_path,
        "tags": tags_pl
    }

    new_entry_en = {
        "id": post_id,
        "title": title_en,
        "date": date_str,
        "desc": desc_en,
        "image": image_path,
        "tags": tags_en
    }

    # Wczytaj, dodaj na początek, zapisz PL
    data_pl = load_json(JSON_PATH_PL)
    data_pl.insert(0, new_entry_pl)
    save_json(JSON_PATH_PL, data_pl)
    print(f"✅ Zaktualizowano indeks PL: {JSON_PATH_PL}")

    # Wczytaj, dodaj na początek, zapisz EN
    data_en = load_json(JSON_PATH_EN)
    data_en.insert(0, new_entry_en)
    save_json(JSON_PATH_EN, data_en)
    print(f"✅ Zaktualizowano indeks EN: {JSON_PATH_EN}")

    # 3. Tworzenie plików MD
    create_markdown_file(f"{POSTS_DIR_PL}/{post_id}.md", title_pl, date_str)
    create_markdown_file(f"{POSTS_DIR_EN}/{post_id}.md", title_en, date_str)

    # 4. Aktualizacja sitemap.xml
    update_sitemap(post_id, date_str)

    print("\n🎉 Gotowe! Teraz edytuj utworzone pliki .md.")

if __name__ == "__main__":
    main()
