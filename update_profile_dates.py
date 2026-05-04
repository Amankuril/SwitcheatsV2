import os
import re

filepath = 'Frontend/src/modules/Food/pages/user/profile/EditProfile.jsx'
with open(filepath, 'r') as f:
    content = f.read()

# 1. Update buildFormDataFromProfile
content = re.sub(
    r'dateOfBirth: profile\.dateOfBirth[\s\S]*?: null,',
    '''dateOfBirth: profile.dateOfBirth
    ? dayjs(profile.dateOfBirth).format('YYYY-MM-DD')
    : "",''',
    content
)

content = re.sub(
    r'anniversary: profile\.anniversary[\s\S]*?: null,',
    '''anniversary: profile.anniversary
    ? dayjs(profile.anniversary).format('YYYY-MM-DD')
    : "",''',
    content
)

# 2. Update saveEditProfileDraft call in useEffect
content = re.sub(
    r'dateOfBirth: formData\.dateOfBirth \? formData\.dateOfBirth\.format\(\'YYYY-MM-DD\'\) : null,',
    "dateOfBirth: formData.dateOfBirth || null,",
    content
)
content = re.sub(
    r'anniversary: formData\.anniversary \? formData\.anniversary\.format\(\'YYYY-MM-DD\'\) : null,',
    "anniversary: formData.anniversary || null,",
    content
)

# 3. Update updateUserProfile call in processProfileImageFile
content = re.sub(
    r'dateOfBirth: formData\.dateOfBirth \? formData\.dateOfBirth\.format\(\'YYYY-MM-DD\'\) : null,',
    "dateOfBirth: formData.dateOfBirth || null,",
    content
)
content = re.sub(
    r'anniversary: formData\.anniversary \? formData\.anniversary\.format\(\'YYYY-MM-DD\'\) : null,',
    "anniversary: formData.anniversary || null,",
    content
)

# 4. Update handleUpdate (updateData)
content = re.sub(
    r'dateOfBirth: formData\.dateOfBirth \? formData\.dateOfBirth\.format\(\'YYYY-MM-DD\'\) : undefined,',
    "dateOfBirth: formData.dateOfBirth || undefined,",
    content
)
content = re.sub(
    r'anniversary: formData\.anniversary \? formData\.anniversary\.format\(\'YYYY-MM-DD\'\) : undefined,',
    "anniversary: formData.anniversary || undefined,",
    content
)

# 5. Update saveProfileToStorage in handleUpdate
content = re.sub(
    r'dateOfBirth: updatedUser\.dateOfBirth \|\| formData\.dateOfBirth\?\.format\(\'YYYY-MM-DD\'\),',
    "dateOfBirth: updatedUser.dateOfBirth || formData.dateOfBirth,",
    content
)
content = re.sub(
    r'anniversary: updatedUser\.anniversary \|\| formData\.anniversary\?\.format\(\'YYYY-MM-DD\'\),',
    "anniversary: updatedUser.anniversary || formData.anniversary,",
    content
)


# 6. Replace DatePicker blocks with standard <Input type="date">
dob_block = re.search(r'(<LocalizationProvider dateAdapter=\{AdapterDayjs\}>[\s\S]*?</LocalizationProvider>)', content)
if dob_block:
    replacement = """<div className="flex items-center gap-2">
                <Input
                  id="dateOfBirth"
                  type="date"
                  value={formData.dateOfBirth}
                  onChange={(e) => handleChange('dateOfBirth', e.target.value)}
                  max={dayjs().format('YYYY-MM-DD')}
                  className="flex-1 h-12 text-base border border-gray-300 dark:border-gray-700 focus:border-[#EB590E] focus:ring-1 focus:ring-[#EB590E] rounded-lg bg-white dark:bg-[#1a1a1a] text-gray-900 dark:text-white [&::-webkit-calendar-picker-indicator]:dark:invert"
                />
              </div>"""
    content = content.replace(dob_block.group(1), replacement, 1)

anniversary_block = re.search(r'(<LocalizationProvider dateAdapter=\{AdapterDayjs\}>[\s\S]*?</LocalizationProvider>)', content)
if anniversary_block:
    replacement = """<div className="flex items-center gap-2">
                <Input
                  id="anniversary"
                  type="date"
                  value={formData.anniversary}
                  onChange={(e) => handleChange('anniversary', e.target.value)}
                  max={dayjs().format('YYYY-MM-DD')}
                  className="flex-1 h-12 text-base border border-gray-300 dark:border-gray-700 focus:border-[#EB590E] focus:ring-1 focus:ring-[#EB590E] rounded-lg bg-white dark:bg-[#1a1a1a] text-gray-900 dark:text-white [&::-webkit-calendar-picker-indicator]:dark:invert"
                />
              </div>"""
    content = content.replace(anniversary_block.group(1), replacement, 1)

with open(filepath, 'w') as f:
    f.write(content)

print("Done")
