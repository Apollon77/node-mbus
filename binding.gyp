{
	'conditions': [
		[
			'OS=="linux"', {
				'targets': [
					{
						'target_name': 'mbus',
						'cflags': [
							'-Wall'
						],
						'include_dirs': [
							'./libmbus/mbus',
							"<!(node -e \"require('nan')\")"
						],
						'sources': [
							'./src/main.cc',
							'./src/mbus-master.cc',
							'./src/util.cc'
						],
                        'dependencies': [
                            'libmbus'
                        ]
					},
					{
						'target_name': 'libmbus',
                        'type': 'static_library',
						'cflags': [
							'-Wall -fPIC'
						],
						'include_dirs': [
							'./libmbus/mbus',
						],
						'sources': [
							'./libmbus/mbus/mbus-protocol-aux.c',
							'./libmbus/mbus/mbus-protocol.c',
							'./libmbus/mbus/mbus-serial.c',
							'./libmbus/mbus/mbus-tcp.c',
							'./libmbus/mbus/mbus.c'
						]
					}
				]
			}
		],[
			'OS=="mac"', {
				'targets': [
					{
						'target_name': 'mbus',
						'cflags': [
							'-Wall'
						],
						'include_dirs': [
							'./libmbus/mbus',
							"<!(node -e \"require('nan')\")"
						],
						'sources': [
							'./src/main.cc',
							'./src/mbus-master.cc',
							'./src/util.cc'
						],
						'xcode_settings': {
				            'OTHER_LDFLAGS': [
				              	'../libmbus/mbus/mbus-protocol-aux.o',
								'../libmbus/mbus/mbus-protocol.o',
								'../libmbus/mbus/mbus-serial.o',
								'../libmbus/mbus/mbus-tcp.o',
								'../libmbus/mbus/mbus.o'
				            ]
				         }
					},
				]
			}
		]
	]
}
