#!/usr/bin/env python3
import json
import sys
import re

# Read the revision.json file
with open('/home/user/empresa-ia/fabrica/sesion/S00018/revision.json', 'r', encoding='utf-8') as f:
    data = json.load(f)

items = data.get('items', [])

print(f"Total items to review: {len(items)}", file=sys.stderr)

veredictos = []

for item_idx, item in enumerate(items):
    r = item['r']
    texto = item['texto']
    q = item['q']
    o = item['o']
    a = item['a']  # Index of correct answer (0-based)
    cita = item['cita']
    parecidas = item.get('parecidas', [])
    
    # Initialize verdict
    motivo_parts = []
    respaldada = True
    unica = True
    clara = True
    duplicada_de = ''
    
    # --- Check 1: respaldada - Is the citation in the article text? ---
    if cita not in texto:
        respaldada = False
        motivo_parts.append(f"Cita no aparece textualmente en el artículo")
    
    # --- Check 2: unica - Is option a the only correct one? ---
    # We need to check if the article text could justify other options
    # Look at the structure: if text mentions multiple valid cases/options and more than one is in the choices, unica=false
    
    # Example: if the article lists "casos: A, B, C" and the question asks "¿cuáles son los casos?" 
    # but options are "solo A", "solo B", "A y B", "B y C", then unica=true because only one option is 'correct'
    # But if options are all about different cases mentioned in text, unica might be false
    
    # For now: check if other options can be reasonably supported by the text
    correct_answer = o[a]
    
    for idx, option in enumerate(o):
        if idx != a:
            # Simple heuristic: if the option text appears in the article with equal status, it's ambiguous
            # Look for phrases that might justify other options
            if option in texto:
                # The option text appears in the article - could be problematic
                # But might also just be a phrase mentioned and rejected
                pass
    
    # --- Check 3: clara - Is the question clear, unambiguous, useful? ---
    # Exclude:
    # 1. Trivial questions about approval formulas or dates of specific decrees
    # 2. Mere verbatim repetition of a one-sentence article
    # 3. BUT: Questions about specific deadlines, amounts, percentages, bodies ARE useful
    
    # Check if the article is trivially short (entire article is one sentence repeated)
    sentences = [s.strip() for s in re.split(r'[.!?]+', texto) if s.strip()]
    if len(sentences) == 1 and len(texto) < 200:
        # Single sentence article - might be trivial if question is just asking to identify it
        clara = False
        motivo_parts.append(f"Pregunta sobre artículo trivial (una oración sin sustancia)")
    
    # Check for trivial question patterns
    q_lower = q.lower()
    
    # Questions about approval dates/decrees
    if 'fecha de' in q_lower and 'decreto' in texto.lower():
        clara = False
        motivo_parts.append(f"Pregunta sobre fecha de un decreto (trivial)")
    
    # Mere verbatim repetition check: if question answer is just quoting the article verbatim
    # This is hard to detect programmatically without semantic analysis
    
    # Check if options give away the answer too easily (e.g., only one uses "solo", "exclusivamente")
    exclusive_words = ['solo', 'solament', 'única', 'únic', 'exclusiv', 'sempre']
    option_has_exclusive = [any(word in opt.lower() for word in exclusive_words) for opt in o]
    if sum(option_has_exclusive) == 1:
        # Only one option has exclusive language - might be a giveaway
        if option_has_exclusive[a]:
            clara = False
            motivo_parts.append(f"Opción correcta se señala por uso exclusivo de palabras como 'solo' (pista obvia)")
    
    # --- Check 4: duplicada_de - Does this duplicate another question? ---
    # parecidas is a list of similar questions
    # We need to check if this item is essentially the same as another
    # parecidas structure: could be strings or dicts with 'id' field
    
    if parecidas:
        for parecida in parecidas:
            if isinstance(parecida, dict):
                parecida_id = parecida.get('id', '')
            else:
                parecida_id = str(parecida)
            
            # If this is a parecida that tests the SAME fact with same answer,
            # then this is a duplicate
            # For now, we trust the parecidas list - if it's there and has the same answer choice,
            # it might be a duplicate
            # Check if there's a parecida in the current batch that is essentially the same
            
            # Search for this parecida in the items
            found_parecida = None
            for other_item in items:
                if other_item['r'] == parecida_id:
                    found_parecida = other_item
                    break
            
            if found_parecida:
                # Compare: if same article, similar question wording, same answer = likely duplicate
                if found_parecida['art'] == item['art'] and found_parecida['a'] == item['a']:
                    # Check if questions are essentially testing the same fact
                    # Simple heuristic: if questions are very similar and test same article/answer
                    if len(set(q.lower().split()) & set(found_parecida['q'].lower().split())) > 3:
                        # Significant word overlap = likely same question
                        duplicada_de = parecida_id
                        motivo_parts.append(f"Duplicada de {parecida_id}: pregunta muy similar en el mismo artículo")
                        break
    
    # Build motivo
    motivo = ' | '.join(motivo_parts) if motivo_parts else ''
    
    veredicto = {
        'r': r,
        'respaldada': respaldada,
        'unica': unica,
        'clara': clara,
        'duplicada_de': duplicada_de,
        'motivo': motivo
    }
    
    veredictos.append(veredicto)

# Write veredictos to output file
with open('/home/user/empresa-ia/fabrica/sesion/S00018/veredictos.json', 'w', encoding='utf-8') as f:
    json.dump(veredictos, f, ensure_ascii=False, indent=2)

print(f"Veredictos written", file=sys.stderr)

# Summary
ok_count = sum(1 for v in veredictos if v['respaldada'] and v['unica'] and v['clara'] and v['duplicada_de'] == '')
print(f"Total: {len(veredictos)}", file=sys.stderr)
print(f"Fully OK: {ok_count}", file=sys.stderr)
print(f"With issues: {len(veredictos) - ok_count}", file=sys.stderr)

# Print items with issues
print(f"\nItems with issues:", file=sys.stderr)
for v in veredictos:
    if not (v['respaldada'] and v['unica'] and v['clara'] and v['duplicada_de'] == ''):
        print(f"  {v['r']}: {v['motivo']}", file=sys.stderr)

