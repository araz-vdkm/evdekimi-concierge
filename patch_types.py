path = "src/components/CheckInFlow.tsx"
with open(path, "r") as f:
    content = f.read()

content = content.replace(
    "useState<Partial<Guest & { photoBase64?: string }>[]>([",
    "useState<Partial<Guest & { photoBase64?: string; existingId?: string; gender?: string }>[]>([",
)
with open(path, "w") as f:
    f.write(content)
