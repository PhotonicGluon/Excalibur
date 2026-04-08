🗃️ Modified the Excalibur database:

- Modified the `User` table:
  - Added `auth_protocol`, `obfuscated_names`, and `registration_record` fields
  - Made `srp_group`, `srp_salt`, and `srp_verifier` fields optional (since they are not used for the OPAQUE-3DH protocol)

- Added the `FSItem` table
