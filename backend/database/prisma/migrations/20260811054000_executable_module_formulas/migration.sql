-- Existing display formulas become safe, executable expressions.
UPDATE "Module" SET "formula" = CASE "id"
    WHEN 'cat-adult' THEN '100 * IW ^ 0.67'
    WHEN 'cat-senior-cardio' THEN '100 * IW ^ 0.67'
    WHEN 'cat-lactation' THEN '100 * IW ^ 0.67 + IW * K * L'
    WHEN 'cat-pregnancy' THEN '140 * IW ^ 0.67'
    WHEN 'cat-kitten' THEN '100 * AW ^ 0.67 * 6.7 * (exp(-0.189 * AW / IW) - 0.66)'
    WHEN 'dog-pregnancy-1' THEN '132 * IW ^ 0.75'
    WHEN 'dog-pregnancy-2' THEN '130 * IW ^ 0.75 + 26 * IW'
    WHEN 'dog-adult' THEN '100 * IW ^ 0.75'
    WHEN 'dog-lactation' THEN '100 * IW ^ 0.75 + IW * (24 * N + 12 * M) * L'
    WHEN 'dog-senior-cardio' THEN '90 * IW ^ 0.75'
    WHEN 'dog-sport' THEN '100 * IW ^ 0.75'
    WHEN 'dog-puppy-1' THEN '100 * AW ^ 0.75 * 3.2 * (exp(-0.87 * AW / IW) - 0.1)'
    WHEN 'dog-puppy-2' THEN '100 * AW ^ 0.75 * 3.2 * (exp(-0.87 * AW / IW) - 0.1)'
    ELSE "formula"
END;
