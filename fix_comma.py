with open("src/components/Dashboard.tsx", "r") as f:
    content = f.read()

content = content.replace("  ,\n", "  },\n")
content = content.replace("    ,\n", "  },\n")
content = content.replace("  , [spreadsheetId]);", "  }, [spreadsheetId]);")
content = content.replace("    , [spreadsheetId]);", "  }, [spreadsheetId]);")

with open("src/components/Dashboard.tsx", "w") as f:
    f.write(content)

print("comma fixed")
