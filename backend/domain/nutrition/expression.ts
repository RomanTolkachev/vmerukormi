type Variables = Record<string, number>;

class Parser {
  private position = 0;

  constructor(private readonly source: string, private readonly variables: Variables) {}

  parse() {
    const value = this.expression();
    this.space();
    if (this.position !== this.source.length) throw new Error("Некорректная формула");
    if (!Number.isFinite(value)) throw new Error("Формула вернула некорректное значение");
    return value;
  }

  private expression(): number {
    let value = this.term();
    while (true) {
      if (this.take("+")) value += this.term();
      else if (this.take("-")) value -= this.term();
      else return value;
    }
  }

  private term(): number {
    let value = this.power();
    while (true) {
      if (this.take("*")) value *= this.power();
      else if (this.take("/")) value /= this.power();
      else return value;
    }
  }

  private power(): number {
    const value = this.unary();
    return this.take("^") ? value ** this.power() : value;
  }

  private unary(): number {
    if (this.take("+")) return this.unary();
    if (this.take("-")) return -this.unary();
    return this.primary();
  }

  private primary(): number {
    if (this.take("(")) {
      const value = this.expression();
      if (!this.take(")")) throw new Error("В формуле не закрыта скобка");
      return value;
    }

    const number = this.match(/^(?:\d+(?:\.\d*)?|\.\d+)/);
    if (number) return Number(number);

    const identifier = this.match(/^[A-Za-z_][A-Za-z0-9_]*/);
    if (!identifier) throw new Error("В формуле ожидалось число или переменная");
    if (this.take("(")) {
      const args: number[] = [];
      if (!this.peek(")")) {
        do args.push(this.expression()); while (this.take(","));
      }
      if (!this.take(")")) throw new Error("В вызове функции не закрыта скобка");
      if (identifier === "exp" && args.length === 1) return Math.exp(args[0]);
      if (identifier === "min" && args.length) return Math.min(...args);
      if (identifier === "max" && args.length) return Math.max(...args);
      throw new Error(`Неизвестная функция ${identifier}`);
    }
    if (!(identifier in this.variables)) throw new Error(`Неизвестная переменная ${identifier}`);
    return this.variables[identifier];
  }

  private space() {
    while (/\s/.test(this.source[this.position] ?? "")) this.position += 1;
  }

  private peek(value: string) {
    this.space();
    return this.source.startsWith(value, this.position);
  }

  private take(value: string) {
    if (!this.peek(value)) return false;
    this.position += value.length;
    return true;
  }

  private match(pattern: RegExp) {
    this.space();
    const match = this.source.slice(this.position).match(pattern)?.[0];
    if (match) this.position += match.length;
    return match;
  }
}

export function evaluateExpression(source: string, variables: Variables) {
  if (!source.trim() || source.length > 500) throw new Error("Некорректная формула");
  return new Parser(source, variables).parse();
}
