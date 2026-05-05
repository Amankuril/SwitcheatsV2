import os

filepath = 'Frontend/src/modules/Food/pages/user/Categories.jsx'
with open(filepath, 'r') as f:
    content = f.read()

replacements = [
    ('className="min-h-screen bg-white pb-10"', 'className="min-h-screen bg-white dark:bg-[#0a0a0a] pb-10"'),
    ('bg-white/80 backdrop-blur-md border-b border-neutral-100', 'bg-white/80 dark:bg-[#0a0a0a]/80 backdrop-blur-md border-b border-neutral-100 dark:border-neutral-800'),
    ('hover:bg-neutral-100 rounded-full transition-colors', 'hover:bg-neutral-100 dark:hover:bg-neutral-800 rounded-full transition-colors'),
    ('text-neutral-800"', 'text-neutral-800 dark:text-neutral-200"'),
    ('text-xl font-bold text-neutral-900', 'text-xl font-bold text-neutral-900 dark:text-white'),
    ('text-neutral-500 font-bold uppercase', 'text-neutral-500 dark:text-neutral-400 font-bold uppercase'),
    ('text-neutral-400 group-focus-within:text-[#EB590E]', 'text-neutral-400 dark:text-neutral-500 group-focus-within:text-[#EB590E]'),
    ('w-full pl-12 pr-4 py-4 bg-neutral-50 border border-neutral-100 rounded-2xl text-sm font-medium focus:outline-none focus:ring-4 focus:ring-[#EB590E]/5 focus:border-[#EB590E] transition-all placeholder:text-neutral-400', 'w-full pl-12 pr-4 py-4 bg-neutral-50 dark:bg-[#1a1a1a] border border-neutral-100 dark:border-neutral-800 rounded-2xl text-sm font-medium text-neutral-900 dark:text-white focus:outline-none focus:ring-4 focus:ring-[#EB590E]/5 focus:border-[#EB590E] transition-all placeholder:text-neutral-400 dark:placeholder:text-neutral-500'),
    ('bg-neutral-100 border border-neutral-50', 'bg-neutral-100 dark:bg-neutral-800 border border-neutral-50 dark:border-neutral-700'),
    ('h-2 w-12 bg-neutral-100 rounded-full', 'h-2 w-12 bg-neutral-100 dark:bg-neutral-800 rounded-full'),
    ('border border-neutral-100 bg-white', 'border border-neutral-100 dark:border-neutral-800 bg-white dark:bg-[#1a1a1a]'),
    ('text-neutral-700 text-center', 'text-neutral-700 dark:text-neutral-300 text-center'),
    ('bg-neutral-50 rounded-full flex', 'bg-neutral-50 dark:bg-neutral-900 rounded-full flex'),
    ('text-neutral-300"', 'text-neutral-300 dark:text-neutral-700"'),
    ('text-lg font-bold text-neutral-900"', 'text-lg font-bold text-neutral-900 dark:text-white"'),
    ('text-sm text-neutral-500 mt-2', 'text-sm text-neutral-500 dark:text-neutral-400 mt-2'),
    ('bg-neutral-900 text-white', 'bg-neutral-900 dark:bg-white text-white dark:text-neutral-900')
]

for old, new in replacements:
    content = content.replace(old, new)

with open(filepath, 'w') as f:
    f.write(content)

print("Applied dark mode styles.")
