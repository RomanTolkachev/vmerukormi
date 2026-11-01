export default function contains(context: Element | null | undefined, node: Node | null | undefined): boolean {
	if (!context || !node) {
		return false;
	}
	return context === node || context.contains(node);
}

