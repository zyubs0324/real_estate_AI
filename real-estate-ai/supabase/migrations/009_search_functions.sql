CREATE OR REPLACE FUNCTION search_properties(keywords text[])
RETURNS SETOF properties AS $$
DECLARE
  kw text;
  q text := 'SELECT * FROM properties WHERE true';
BEGIN
  FOREACH kw IN ARRAY keywords LOOP
    q := q || format(' AND (
      handling_name ILIKE %L OR alias ILIKE %L OR building_name ILIKE %L
      OR road_address ILIKE %L OR neighborhood ILIKE %L OR unit_number ILIKE %L
      OR category ILIKE %L
    )', '%'||kw||'%', '%'||kw||'%', '%'||kw||'%',
       '%'||kw||'%', '%'||kw||'%', '%'||kw||'%', '%'||kw||'%');
  END LOOP;
  q := q || ' ORDER BY created_at DESC';
  RETURN QUERY EXECUTE q;
END;
$$ LANGUAGE plpgsql STABLE;
