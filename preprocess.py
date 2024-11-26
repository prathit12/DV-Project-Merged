import pandas as pd
vitals_path = './Dataset/icu/chartevents.csv'
columns = ["subject_id","hadm_id","itemid","valuenum","charttime"]
df = pd.read_csv(vitals_path, usecols = columns)
df = df[(df["itemid"]==220045) | (df["itemid"]==220277) | (df["itemid"]==220179) | (df["itemid"]==220180)]
df.to_csv('./Dataset/icu/charteventssubset.csv', index = False)
print(df)